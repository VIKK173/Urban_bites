/**
 * SQLite → MySQL data import for Urban Bites.
 * Run:  bun scripts/migration/import-mysql.ts [--dry-run]
 *
 * Safety properties:
 *  - Preflight verifies every dump file against the live Prisma schema (DMMF):
 *    field names, nullability, and value types (dates, booleans, numbers).
 *  - Refuses to run when DATABASE_URL is unset / still a placeholder, or does
 *    not point at the `urban_bites` database. Never prints connection strings.
 *  - Refuses to import when any destination table holds MORE rows than the
 *    dump (would mean pre-existing data the import could shadow).
 *  - Writes happen in ONE transaction: all tables import or none do.
 *  - createMany + skipDuplicates keeps reruns idempotent (INSERT IGNORE).
 *  - No DELETE/TRUNCATE/UPDATE anywhere; row contents (names, emails, hashes)
 *    are never printed — only table names, counts and error codes.
 *
 *  --dry-run: runs the whole preflight + destination checks and exits without
 *  writing anything (it does open a DB connection for the count checks).
 */
import { PrismaClient, Prisma } from '@prisma/client'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const DRY_RUN = process.argv.includes('--dry-run')
const DUMP_DIR = join(process.cwd(), 'scripts', 'migration', 'dump')

// FK-safe insert order: referenced tables before referencing tables.
const ORDER = [
  'user', 'category', 'product', 'productImage', 'address', 'cartItem',
  'order', 'orderItem', 'payment', 'coupon', 'review', 'favorite',
  'newsletterSubscriber', 'contactMessage', 'restaurantSettings',
] as const

type Row = Record<string, unknown>
const db = new PrismaClient()

const problems: string[] = []
const notes: string[] = []
const fail = (msg: string) => problems.push(msg)

function loadDump(table: string): Row[] {
  const file = join(DUMP_DIR, `${table}.json`)
  if (!existsSync(file)) {
    fail(`dump missing: ${table}.json`)
    return []
  }
  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8'))
    if (!Array.isArray(parsed)) {
      fail(`dump is not a JSON array: ${table}.json`)
      return []
    }
    return parsed as Row[]
  } catch (e) {
    fail(`dump is not valid JSON: ${table}.json (${(e as Error).message.slice(0, 80)})`)
    return []
  }
}

/** Validates one table's rows against DMMF; returns rows with Dates hydrated. */
function validateAndHydrate(table: string, rows: Row[], fields: readonly Prisma.DMMF.Field[]): Row[] {
  const scalars = fields.filter((f) => f.kind === 'scalar')
  const scalarNames = new Set(scalars.map((f) => f.name))
  const dateTimeFields = new Set(scalars.filter((f) => f.type === 'DateTime').map((f) => f.name))

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const extra = Object.keys(row).filter((k) => !scalarNames.has(k))
    if (extra.length) fail(`${table}[${i}]: dump has fields not in schema: ${extra.join(', ')}`)

    for (const f of scalars) {
      const v = row[f.name]
      if (v === null || v === undefined) {
        if (f.isRequired && !f.hasDefaultValue && !(f.name === 'updatedAt')) {
          fail(`${table}[${i}]: null in required field "${f.name}"`)
        }
        continue
      }
      if (f.type === 'DateTime') {
        if (typeof v !== 'string' || Number.isNaN(Date.parse(v))) {
          fail(`${table}[${i}].${f.name}: expected ISO date string, got ${typeof v}`)
        }
      } else if (f.type === 'Boolean') {
        if (typeof v !== 'boolean') fail(`${table}[${i}].${f.name}: expected boolean, got ${typeof v}`)
      } else if (f.type === 'Int' || f.type === 'Float') {
        if (typeof v !== 'number') fail(`${table}[${i}].${f.name}: expected number, got ${typeof v}`)
      } else if (f.type === 'String') {
        if (typeof v !== 'string') fail(`${table}[${i}].${f.name}: expected string, got ${typeof v}`)
      } else if (f.type === 'BigInt' || f.type === 'Decimal' || f.type === 'Bytes') {
        fail(`${table}[${i}].${f.name}: unhandled schema type ${f.type} — extend the script before importing`)
      }
    }
  }

  return rows.map((row) => {
    const out: Row = { ...row }
    for (const name of dateTimeFields) {
      if (typeof out[name] === 'string') out[name] = new Date(out[name] as string)
    }
    return out
  })
}

async function preflight(): Promise<Map<string, Row[]> | null> {
  console.log('== PREFLIGHT ==')

  // 1. Schema sanity: this project must have no enums/decimals to map.
  const enums = Prisma.dmmf.datamodel.enums
  console.log(`schema enums: ${enums.length} (expected 0 — enum-like values are strings)`)
  if (enums.length) fail(`unexpected enums in schema: ${enums.map((e) => e.name).join(', ')}`)

  // 2. Load + validate all dumps against the schema.
  const data = new Map<string, Row[]>()
  for (const table of ORDER) {
    const rows = loadDump(table)
    const model = Prisma.dmmf.datamodel.models.find(
      (m) => m.name.toLowerCase() === table.toLowerCase(),
    )
    if (!model) {
      fail(`model "${table}" not found in Prisma schema`)
      continue
    }
    data.set(table, validateAndHydrate(table, rows, model.fields))
  }
  for (const table of ORDER) {
    const n = data.get(table)?.length ?? 0
    console.log(`  dump ${table.padEnd(22)} ${n} rows`)
  }
  if (problems.length) return null

  // 3. Connection config: never print the URL itself.
  const url = process.env.DATABASE_URL ?? ''
  if (!url) fail('DATABASE_URL is not set')
  else if (url.includes('YOUR_MYSQL_PASSWORD')) fail('DATABASE_URL still contains the placeholder — set the real MySQL password in .env first')
  else {
    try {
      const parsed = new URL(url)
      if (parsed.protocol.replace(':', '') !== 'mysql') fail(`DATABASE_URL scheme is "${parsed.protocol}", expected mysql:`)
      if (parsed.pathname.replace('/', '') !== 'urban_bites') fail(`DATABASE_URL targets database "${parsed.pathname}", expected /urban_bites`)
    } catch {
      fail('DATABASE_URL is not a valid connection URL')
    }
  }
  if (problems.length) return null

  // 4. Reach the destination and check for pre-existing data (no writes yet).
  try {
    await db.$queryRaw`SELECT 1`
  } catch (e) {
    fail(`cannot connect to MySQL — ${(e as Error).message.split('\n')[0].slice(0, 160)}`)
    return null
  }
  for (const table of ORDER) {
    const dest = (db as any)[table]
    const dumpCount = data.get(table)?.length ?? 0
    let existing: number
    try {
      existing = await dest.count()
    } catch (e) {
      fail(`table "${table}" missing in MySQL — run \`npx prisma db push\` first (${(e as Error).message.slice(0, 100)})`)
      continue
    }
    if (existing > dumpCount) {
      fail(`destination "${table}" has ${existing} rows but dump has ${dumpCount} — refusing to import (pre-existing data would be shadowed)`)
    }
  }

  if (problems.length) return null
  console.log('preflight OK')
  return data
}

async function main() {
  const data = await preflight()
  console.log('')

  if (problems.length) {
    console.error('== PREFLIGHT FAILED — nothing was written ==')
    for (const p of problems) console.error('  ✗ ' + p)
    process.exit(1)
  }
  if (!data) process.exit(1)

  if (DRY_RUN) {
    console.log('== DRY RUN — validated successfully, exiting without writing ==')
    await db.$disconnect()
    return
  }

  // 5. Import everything atomically.
  console.log('== IMPORT (single transaction) ==')
  const inserted: Record<string, number> = {}
  try {
    await db.$transaction(async (tx) => {
      for (const table of ORDER) {
        const rows = data.get(table) ?? []
        inserted[table] = 0
        if (rows.length === 0) continue
        const res = await (tx as any)[table].createMany({ data: rows, skipDuplicates: true })
        inserted[table] = res.count
      }
    }, { timeout: 60_000, maxWait: 10_000 })
  } catch (e) {
    console.error('== IMPORT FAILED — transaction rolled back, MySQL unchanged ==')
    const err = e as { message?: string; code?: string }
    console.error(`  error code: ${err.code ?? 'n/a'}`)
    console.error(`  message:    ${(err.message ?? String(e)).split('\n')[0].slice(0, 200)}`)
    await db.$disconnect()
    process.exit(1)
  }

  // 6. Final report — counts, hashes, invariants. No row contents printed.
  console.log('== REPORT ==')
  let ok = true
  for (const table of ORDER) {
    const dumpCount = data.get(table)?.length ?? 0
    const now = await (db as any)[table].count()
    const match = now === dumpCount
    if (!match) ok = false
    console.log(`  ${table.padEnd(22)} inserted=${String(inserted[table]).padStart(3)}  in-mysql=${String(now).padStart(3)}  dump=${String(dumpCount).padStart(3)}  ${match ? 'OK' : 'MISMATCH'}`)
  }

  const users = await (db as any).user.findMany({ select: { passwordHash: true } })
  const badHashes = users.filter((u: { passwordHash: string }) => !/^\$2[aby]\$/.test(u.passwordHash)).length
  if (badHashes) { ok = false; console.log(`  password hashes: ${badHashes} NOT bcrypt — MISMATCH`) }
  else console.log(`  password hashes: all ${users.length} bcrypt (login will work unchanged)`)

  const dumpOrderItems = (data.get('orderItem') ?? []).reduce((s, r) => s + (r.quantity as number), 0)
  const mysqlOrderItems = await (db as any).orderItem.aggregate({ _sum: { quantity: true } })
  const sumOk = (mysqlOrderItems._sum.quantity ?? 0) === dumpOrderItems
  if (!sumOk) ok = false
  console.log(`  order item quantities: mysql=${mysqlOrderItems._sum.quantity ?? 0} dump=${dumpOrderItems} ${sumOk ? 'OK' : 'MISMATCH'}`)

  const settings = await (db as any).restaurantSettings.findFirst({ where: { id: 'main' } })
  if (!settings) { ok = false; console.log('  settings singleton (id=main): MISSING') }
  else console.log('  settings singleton (id=main): present')

  console.log(ok ? '\nMIGRATION COMPLETE — all checks passed.' : '\nMIGRATION INCOMPLETE — fix mismatches above.')
  await db.$disconnect()
  if (!ok) process.exit(1)
}

main()

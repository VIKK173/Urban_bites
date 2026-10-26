/**
 * Export data from SQLite to JSON for MongoDB migration
 * Run: bun scripts/migration/export-sqlite.ts
 */
import { PrismaClient } from '@prisma/client'
import { writeFileSync, mkdirSync } from 'node:fs'

const db = new PrismaClient()

async function main() {
  console.log('Exporting data from SQLite...')
  mkdirSync('scripts/migration/export', { recursive: true })

  const tables = [
    'user', 'address', 'category', 'product', 'productImage', 'cartItem',
    'order', 'orderItem', 'payment', 'coupon', 'review', 'favorite',
    'newsletterSubscriber', 'contactMessage', 'restaurantSettings',
  ] as const

  const summary: Record<string, number> = {}

  for (const table of tables) {
    const rows = await (db as any)[table].findMany()
    summary[table] = rows.length
    writeFileSync(`scripts/migration/export/${table}.json`, JSON.stringify(rows, null, 2))
    console.log(`Exported ${rows.length} ${table}`)
  }

  writeFileSync('scripts/migration/export/summary.json', JSON.stringify(summary, null, 2))
  console.log('\nExport summary:', JSON.stringify(summary, null, 2))
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())

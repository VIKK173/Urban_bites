// One-off migration helper: dump every table from SQLite to JSON (with FK order).
import { PrismaClient } from '@prisma/client'
import { writeFileSync, mkdirSync } from 'node:fs'

const db = new PrismaClient()
async function main() {
  mkdirSync('scripts/migration/dump', { recursive: true })
  const tables = [
    'user', 'address', 'category', 'product', 'productImage', 'cartItem',
    'order', 'orderItem', 'payment', 'coupon', 'review', 'favorite',
    'newsletterSubscriber', 'contactMessage', 'restaurantSettings',
  ] as const
  const summary: Record<string, number> = {}
  for (const t of tables) {
    const rows = await (db as any)[t].findMany()
    summary[t] = rows.length
    writeFileSync(`scripts/migration/dump/${t}.json`, JSON.stringify(rows, null, 2))
  }
  console.log(JSON.stringify(summary, null, 2))
}
main().finally(() => db.$disconnect())

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ok, route } from '@/lib/api'

/** Sales report — last 14 days revenue/order trends + best sellers. */
export const GET = route(async (req: NextRequest) => {
  await requireAdmin(req)

  const since = new Date(Date.now() - 14 * 24 * 3600 * 1000)

  const orders = await db.order.findMany({
    where: { createdAt: { gte: since }, status: { not: 'CANCELLED' } },
    select: { total: true, createdAt: true },
  })

  const byDay = new Map<string, { revenue: number; orders: number }>()
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 3600 * 1000)
    byDay.set(d.toISOString().slice(0, 10), { revenue: 0, orders: 0 })
  }
  for (const o of orders) {
    const key = o.createdAt.toISOString().slice(0, 10)
    const entry = byDay.get(key)
    if (entry) {
      entry.revenue += o.total
      entry.orders += 1
    }
  }

  const topProducts = await db.orderItem.groupBy({
    by: ['name'],
    _sum: { quantity: true, lineTotal: true },
    orderBy: { _sum: { quantity: 'desc' } },
    take: 8,
  })

  const paymentSplit = await db.order.groupBy({
    by: ['paymentMethod'],
    _count: { paymentMethod: true },
    _sum: { total: true },
  })

  return ok({
    daily: Array.from(byDay.entries()).map(([date, v]) => ({ date, ...v })),
    topProducts: topProducts.map((t) => ({ name: t.name, quantity: t._sum.quantity ?? 0, revenue: t._sum.lineTotal ?? 0 })),
    paymentSplit: paymentSplit.map((p) => ({ method: p.paymentMethod, orders: p._count.paymentMethod, revenue: p._sum.total ?? 0 })),
  })
})

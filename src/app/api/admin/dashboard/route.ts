import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ok, route } from '@/lib/api'

export const GET = route(async (req: NextRequest) => {
  await requireAdmin(req)

  const [
    totalOrders,
    pendingOrders,
    completedOrders,
    cancelledOrders,
    totalCustomers,
    totalProducts,
    revenueAgg,
    recentOrders,
    topItems,
    statusCounts,
  ] = await Promise.all([
    db.order.count(),
    db.order.count({ where: { status: { in: ['PLACED', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'] } } }),
    db.order.count({ where: { status: 'DELIVERED' } }),
    db.order.count({ where: { status: 'CANCELLED' } }),
    db.user.count({ where: { role: 'CUSTOMER' } }),
    db.product.count(),
    db.order.aggregate({ where: { paymentStatus: 'PAID' }, _sum: { total: true } }),
    db.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: { user: { select: { name: true, email: true } }, items: true },
    }),
    db.orderItem.groupBy({
      by: ['name'],
      _sum: { quantity: true, lineTotal: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 6,
    }),
    db.order.groupBy({ by: ['status'], _count: { status: true } }),
  ])

  const productImages = await db.product.findMany({
    select: { name: true, image: true },
    where: { name: { in: topItems.map((t) => t.name) } },
  })
  const imgMap = new Map(productImages.map((p) => [p.name, p.image]))

  return ok({
    stats: {
      totalOrders,
      pendingOrders,
      completedOrders,
      cancelledOrders,
      totalCustomers,
      totalProducts,
      totalRevenue: revenueAgg._sum.total ?? 0,
    },
    statusCounts: statusCounts.map((s) => ({ status: s.status, count: s._count.status })),
    recentOrders: recentOrders.map((o) => ({
      id: o.id, orderNumber: o.orderNumber, status: o.status, paymentStatus: o.paymentStatus,
      total: o.total, createdAt: o.createdAt, itemCount: o.items.length,
      customer: o.user.name, customerEmail: o.user.email,
    })),
    topItems: topItems.map((t) => ({
      name: t.name, quantity: t._sum.quantity ?? 0, revenue: t._sum.lineTotal ?? 0, image: imgMap.get(t.name) ?? null,
    })),
  })
})

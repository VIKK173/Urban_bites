import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ok, parseIntParam, route } from '@/lib/api'
import { ORDER_STATUSES } from '@/lib/pricing'

export const GET = route(async (req: NextRequest) => {
  await requireAdmin(req)
  const sp = req.nextUrl.searchParams
  const page = parseIntParam(sp.get('page'), 1, 1, 10_000)
  const limit = parseIntParam(sp.get('limit'), 15, 1, 100)
  const status = sp.get('status') || ''
  const search = sp.get('search')?.trim() || ''
  const paymentStatus = sp.get('paymentStatus') || ''

  const where: Record<string, unknown> = {}
  if (status && (ORDER_STATUSES as readonly string[]).includes(status)) where.status = status
  if (paymentStatus) where.paymentStatus = paymentStatus
  if (search) {
    where.OR = [
      { orderNumber: { contains: search } },
      { contactName: { contains: search } },
      { contactPhone: { contains: search } },
      { user: { is: { email: { contains: search } } } },
    ]
  }

  const [total, orders] = await Promise.all([
    db.order.count({ where }),
    db.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: { select: { name: true, email: true } },
        items: true,
        payments: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    }),
  ])

  return ok({
    orders,
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  })
})

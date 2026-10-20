import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ApiError, ok, parseIntParam, parseBody, route } from '@/lib/api'

export const GET = route(async (req: NextRequest) => {
  await requireAdmin(req)
  const sp = req.nextUrl.searchParams
  const page = parseIntParam(sp.get('page'), 1, 1, 10_000)
  const limit = parseIntParam(sp.get('limit'), 20, 1, 100)
  const search = sp.get('search')?.trim() || ''
  const role = sp.get('role') || ''

  const where: Record<string, unknown> = {}
  if (role === 'CUSTOMER' || role === 'ADMIN') where.role = role
  if (search) {
    where.OR = [{ name: { contains: search } }, { email: { contains: search } }, { phone: { contains: search } }]
  }

  const [total, users] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true, name: true, email: true, phone: true, role: true, createdAt: true,
        _count: { select: { orders: true } },
      },
    }),
  ])

  const orderTotals = await db.order.groupBy({
    by: ['userId'],
    _sum: { total: true },
    _count: { userId: true },
  })
  const totalsMap = new Map(orderTotals.map((t) => [t.userId, { spend: t._sum.total ?? 0, orders: t._count.userId }]))

  return ok({
    users: users.map((u) => ({
      id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role,
      createdAt: u.createdAt, orderCount: totalsMap.get(u.id)?.orders ?? u._count.orders,
      totalSpend: totalsMap.get(u.id)?.spend ?? 0,
    })),
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  })
})

const patchSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(['CUSTOMER', 'ADMIN']),
})

export const PATCH = route(async (req: NextRequest) => {
  const admin = await requireAdmin(req)
  const body = await parseBody(req, patchSchema)
  if (body.userId === admin.id) throw new ApiError(400, 'You cannot change your own role', 'SELF_ROLE')
  const user = await db.user.update({
    where: { id: body.userId },
    data: { role: body.role },
    select: { id: true, name: true, email: true, role: true },
  })
  return ok({ user })
})

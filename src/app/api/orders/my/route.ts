import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { ok, parseIntParam, route } from '@/lib/api'

export const GET = route(async (req: NextRequest) => {
  const user = await requireUser(req)
  const page = parseIntParam(req.nextUrl.searchParams.get('page'), 1, 1, 10_000)
  const limit = parseIntParam(req.nextUrl.searchParams.get('limit'), 10, 1, 50)

  const [total, orders] = await Promise.all([
    db.order.count({ where: { userId: user.id } }),
    db.order.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { items: true },
    }),
  ])

  return ok({ orders, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } })
})

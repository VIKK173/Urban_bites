import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ok, parseIntParam, route } from '@/lib/api'

export const GET = route(async (req: NextRequest) => {
  await requireAdmin(req)
  const sp = req.nextUrl.searchParams
  const page = parseIntParam(sp.get('page'), 1, 1, 10_000)
  const limit = parseIntParam(sp.get('limit'), 20, 1, 100)
  const approved = sp.get('approved')

  const where: Record<string, unknown> = {}
  if (approved === 'true') where.isApproved = true
  if (approved === 'false') where.isApproved = false

  const [total, reviews] = await Promise.all([
    db.review.count({ where }),
    db.review.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: { select: { name: true, email: true } },
        product: { select: { name: true, slug: true, image: true } },
      },
    }),
  ])
  return ok({ reviews, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } })
})

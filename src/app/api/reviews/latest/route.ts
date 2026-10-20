import { db } from '@/lib/db'
import { ok, parseIntParam } from '@/lib/api'
import { NextRequest } from 'next/server'
import { route } from '@/lib/api'

/** GET /api/reviews/latest — approved reviews across all products (for the homepage). */
export const GET = route(async (req: NextRequest) => {
  const limit = parseIntParam(req.nextUrl.searchParams.get('limit'), 8, 1, 24)
  const reviews = await db.review.findMany({
    where: { isApproved: true, rating: { gte: 4 } },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      user: { select: { name: true } },
      product: { select: { name: true, slug: true, image: true } },
    },
  })
  return ok({
    reviews: reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      title: r.title,
      comment: r.comment,
      userName: r.user.name,
      createdAt: r.createdAt,
      product: r.product,
    })),
  })
})

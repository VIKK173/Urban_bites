import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { ApiError, clientIp, ok, parseIntParam, parseBody, rateLimit, route } from '@/lib/api'

export const GET = route(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params
  const page = parseIntParam(req.nextUrl.searchParams.get('page'), 1, 1, 10_000)
  const limit = parseIntParam(req.nextUrl.searchParams.get('limit'), 10, 1, 50)

  const product = await db.product.findFirst({ where: { OR: [{ id }, { slug: id }] } })
  if (!product) throw new ApiError(404, 'Product not found', 'NOT_FOUND')

  const [total, reviews] = await Promise.all([
    db.review.count({ where: { productId: product.id, isApproved: true } }),
    db.review.findMany({
      where: { productId: product.id, isApproved: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { user: { select: { name: true } } },
    }),
  ])

  return ok({
    reviews: reviews.map((r) => ({
      id: r.id, rating: r.rating, title: r.title, comment: r.comment,
      userName: r.user.name, createdAt: r.createdAt,
    })),
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  })
})

const createSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(80).optional().or(z.literal('')),
  comment: z.string().trim().min(5, 'Review must be at least 5 characters').max(1000),
})

export const POST = route(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser(req)
  const { id } = await ctx.params
  rateLimit(`review:${user.id}:${clientIp(req)}`, 10, 60_000)
  const body = await parseBody(req, createSchema)

  const product = await db.product.findFirst({ where: { OR: [{ id }, { slug: id }] } })
  if (!product) throw new ApiError(404, 'Product not found', 'NOT_FOUND')

  // Eligibility: only customers with a DELIVERED order containing this product may review it.
  const delivered = await db.orderItem.findFirst({
    where: {
      productId: product.id,
      order: { userId: user.id, status: 'DELIVERED' },
    },
  })
  if (!delivered) {
    throw new ApiError(403, 'You can review this item after your first delivered order containing it.', 'NOT_ELIGIBLE')
  }

  const existing = await db.review.findUnique({
    where: { userId_productId: { userId: user.id, productId: product.id } },
  })
  if (existing) throw new ApiError(409, 'You have already reviewed this item.', 'ALREADY_REVIEWED')

  const review = await db.review.create({
    data: {
      userId: user.id,
      productId: product.id,
      rating: body.rating,
      title: body.title || null,
      comment: body.comment,
      isApproved: true,
    },
  })

  // recompute aggregate rating
  const agg = await db.review.aggregate({
    where: { productId: product.id, isApproved: true },
    _avg: { rating: true },
    _count: { rating: true },
  })
  await db.product.update({
    where: { id: product.id },
    data: { rating: Math.round((agg._avg.rating ?? 0) * 10) / 10, ratingCount: agg._count.rating },
  })

  return ok(
    { review: { ...review, userName: user.name } },
    201,
  )
})

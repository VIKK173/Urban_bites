import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ApiError, ok, parseBody, route } from '@/lib/api'

const patchSchema = z.object({ isApproved: z.boolean() })

export const PATCH = route(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  await requireAdmin(req)
  const { id } = await ctx.params
  const body = await parseBody(req, patchSchema)

  const review = await db.review.findUnique({ where: { id } })
  if (!review) throw new ApiError(404, 'Review not found', 'NOT_FOUND')

  const updated = await db.review.update({ where: { id }, data: { isApproved: body.isApproved } })

  // keep the product aggregate in sync with visible reviews
  const agg = await db.review.aggregate({
    where: { productId: review.productId, isApproved: true },
    _avg: { rating: true },
    _count: { rating: true },
  })
  await db.product.update({
    where: { id: review.productId },
    data: { rating: Math.round((agg._avg.rating ?? 0) * 10) / 10, ratingCount: agg._count.rating },
  })

  return ok({ review: updated })
})

export const DELETE = route(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  await requireAdmin(req)
  const { id } = await ctx.params
  const review = await db.review.findUnique({ where: { id } })
  if (!review) throw new ApiError(404, 'Review not found', 'NOT_FOUND')
  await db.review.delete({ where: { id } })

  const agg = await db.review.aggregate({
    where: { productId: review.productId, isApproved: true },
    _avg: { rating: true },
    _count: { rating: true },
  })
  await db.product.update({
    where: { id: review.productId },
    data: { rating: Math.round((agg._avg.rating ?? 0) * 10) / 10, ratingCount: agg._count.rating },
  })

  return ok({ deleted: true })
})

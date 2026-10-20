import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ApiError, ok, parseBody, route } from '@/lib/api'
import { serializeProduct } from '@/lib/catalog'

export const GET = route(async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params
  const product = await db.product.findFirst({
    where: { OR: [{ id }, { slug: id }] },
    include: {
      category: { select: { name: true, slug: true } },
      reviews: {
        where: { isApproved: true },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { user: { select: { name: true } } },
      },
    },
  })
  if (!product) throw new ApiError(404, 'Product not found', 'NOT_FOUND')

  const approved = await db.review.aggregate({
    where: { productId: product.id, isApproved: true },
    _avg: { rating: true },
    _count: { rating: true },
  })

  const { reviews, ...p } = product
  return ok({
    product: serializeProduct(p),
    reviews: reviews.map((r) => ({
      id: r.id, rating: r.rating, title: r.title, comment: r.comment,
      userName: r.user.name, createdAt: r.createdAt,
    })),
    reviewStats: {
      average: approved._avg.rating ?? p.rating,
      count: approved._count.rating,
    },
  })
})

const patchSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().min(10).max(2000).optional(),
  price: z.number().int().min(100).max(10_000_000).optional(),
  comparePrice: z.number().int().min(100).max(10_000_000).nullable().optional(),
  categoryId: z.string().min(1).optional(),
  image: z.string().trim().max(500).nullable().optional(),
  isVeg: z.boolean().optional(),
  spiceLevel: z.number().int().min(0).max(3).optional(),
  ingredients: z.array(z.string().trim().max(80)).max(20).optional(),
  allergens: z.array(z.string().trim().max(80)).max(12).optional(),
  options: z
    .array(
      z.object({
        group: z.string().trim().min(1).max(40),
        required: z.boolean(),
        multi: z.boolean(),
        choices: z.array(z.object({ label: z.string().trim().min(1).max(60), price: z.number().int().min(0) })).min(1).max(10),
      }),
    )
    .max(5)
    .optional(),
  isAvailable: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
})

export const PATCH = route(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  await requireAdmin(req)
  const { id } = await ctx.params
  const body = await parseBody(req, patchSchema)

  const existing = await db.product.findUnique({ where: { id } })
  if (!existing) throw new ApiError(404, 'Product not found', 'NOT_FOUND')

  const data: Record<string, unknown> = { ...body }
  if (body.ingredients) data.ingredients = JSON.stringify(body.ingredients)
  if (body.allergens) data.allergens = JSON.stringify(body.allergens)
  if (body.options) data.options = JSON.stringify(body.options)
  if (body.categoryId) {
    const cat = await db.category.findUnique({ where: { id: body.categoryId } })
    if (!cat) throw new ApiError(400, 'Category not found', 'BAD_CATEGORY')
  }

  const product = await db.product.update({
    where: { id },
    data,
    include: { category: { select: { name: true, slug: true } } },
  })
  return ok({ product: serializeProduct(product) })
})

export const DELETE = route(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  await requireAdmin(req)
  const { id } = await ctx.params
  const existing = await db.product.findUnique({ where: { id } })
  if (!existing) throw new ApiError(404, 'Product not found', 'NOT_FOUND')

  // Order history keeps snapshots (OrderItem.product is SetNull) — safe to delete.
  await db.product.delete({ where: { id } })
  return ok({ deleted: true })
})

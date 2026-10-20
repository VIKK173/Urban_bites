import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { ok, parseBody, route } from '@/lib/api'

export const GET = route(async (req: NextRequest) => {
  const user = await requireUser(req)
  const favorites = await db.favorite.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    include: { product: { include: { category: { select: { name: true, slug: true } } } } },
  })
  return ok({
    productIds: favorites.map((f) => f.productId),
    products: favorites.map((f) => ({
      id: f.product.id, name: f.product.name, slug: f.product.slug, image: f.product.image,
      price: f.product.price, comparePrice: f.product.comparePrice, isVeg: f.product.isVeg,
      rating: f.product.rating, ratingCount: f.product.ratingCount, isAvailable: f.product.isAvailable,
      category: f.product.category, description: f.product.description,
    })),
  })
})

const schema = z.object({ productId: z.string().min(1) })

/** Toggle favorite. */
export const POST = route(async (req: NextRequest) => {
  const user = await requireUser(req)
  const { productId } = await parseBody(req, schema)

  const product = await db.product.findUnique({ where: { id: productId } })
  if (!product) return ok({ error: 'Product not found' }, 404)

  const existing = await db.favorite.findUnique({
    where: { userId_productId: { userId: user.id, productId } },
  })
  if (existing) {
    await db.favorite.delete({ where: { id: existing.id } })
    return ok({ favorited: false })
  }
  await db.favorite.create({ data: { userId: user.id, productId } })
  return ok({ favorited: true })
})

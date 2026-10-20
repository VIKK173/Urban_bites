import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ok, parseIntParam, parseBody, route } from '@/lib/api'
import { serializeProduct } from '@/lib/catalog'

/**
 * GET /api/products
 * Query: search, category (slug), veg (true|false), sort (popular|price_asc|price_desc|rating|newest),
 *        featured, page, limit, available
 */
export const GET = route(async (req: NextRequest) => {
  const sp = req.nextUrl.searchParams
  const page = parseIntParam(sp.get('page'), 1, 1, 10_000)
  const limit = parseIntParam(sp.get('limit'), 12, 1, 60)
  const search = sp.get('search')?.trim() || ''
  const category = sp.get('category')?.trim() || ''
  const veg = sp.get('veg')
  const sort = sp.get('sort') || 'popular'
  const featured = sp.get('featured') === 'true'
  const available = sp.get('available')

  const where: Record<string, unknown> = {}
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { description: { contains: search } },
    ]
  }
  if (category) where.category = { slug: category }
  if (veg === 'true') where.isVeg = true
  if (veg === 'false') where.isVeg = false
  if (featured) where.isFeatured = true
  if (available === 'true') where.isAvailable = true

  const orderBy: Record<string, 'asc' | 'desc'>[] =
    sort === 'price_asc' ? [{ price: 'asc' }]
    : sort === 'price_desc' ? [{ price: 'desc' }]
    : sort === 'rating' ? [{ rating: 'desc' }, { ratingCount: 'desc' }]
    : sort === 'newest' ? [{ createdAt: 'desc' }]
    : [{ soldCount: 'desc' }]

  const [total, products] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: { category: { select: { name: true, slug: true } } },
    }),
  ])

  return ok({
    products: products.map(serializeProduct),
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  })
})

// ------------------------------------------------------------ admin create
const productSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().min(10).max(2000),
  price: z.number().int().min(100).max(10_000_000), // paise
  comparePrice: z.number().int().min(100).max(10_000_000).nullable().optional(),
  categoryId: z.string().min(1),
  image: z.string().trim().max(500).optional().nullable(),
  isVeg: z.boolean().default(true),
  spiceLevel: z.number().int().min(0).max(3).default(0),
  ingredients: z.array(z.string().trim().max(80)).max(20).default([]),
  allergens: z.array(z.string().trim().max(80)).max(12).default([]),
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
    .default([]),
  isAvailable: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
})

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80)

export const POST = route(async (req: NextRequest) => {
  await requireAdmin(req)
  const body = await parseBody(req, productSchema)

  const category = await db.category.findUnique({ where: { id: body.categoryId } })
  if (!category) return ok({ error: 'Category not found' }, 400)

  let slug = slugify(body.name)
  if (await db.product.findUnique({ where: { slug } })) slug = `${slug}-${Date.now().toString(36).slice(-4)}`

  const product = await db.product.create({
    data: {
      name: body.name,
      slug,
      description: body.description,
      price: body.price,
      comparePrice: body.comparePrice ?? null,
      categoryId: body.categoryId,
      image: body.image || null,
      isVeg: body.isVeg,
      spiceLevel: body.spiceLevel,
      ingredients: JSON.stringify(body.ingredients),
      allergens: JSON.stringify(body.allergens),
      options: JSON.stringify(body.options),
      isAvailable: body.isAvailable,
      isFeatured: body.isFeatured,
    },
    include: { category: { select: { name: true, slug: true } } },
  })
  return ok({ product: serializeProduct(product) }, 201)
})

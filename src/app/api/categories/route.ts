import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ok, route } from '@/lib/api'

export const GET = route(async (_req: NextRequest) => {
  const categories = await db.category.findMany({
    orderBy: { sortOrder: 'asc' },
    include: { _count: { select: { products: { where: { isAvailable: true } } } } },
  })
  return ok({
    categories: categories.map((c) => ({
      id: c.id, name: c.name, slug: c.slug, description: c.description,
      image: c.image, sortOrder: c.sortOrder, productCount: c._count.products,
    })),
  })
})

export const POST = route(async (req: NextRequest) => {
  await requireAdmin(req)
  const body = await req.json()
  const name = String(body?.name || '').trim()
  if (name.length < 2) return ok({ error: 'Name too short' }, 400)
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  const exists = await db.category.findUnique({ where: { slug } })
  if (exists) return ok({ error: 'Category already exists' }, 409)
  const maxSort = await db.category.aggregate({ _max: { sortOrder: true } })
  const category = await db.category.create({
    data: { name, slug, description: body?.description || null, image: body?.image || null, sortOrder: (maxSort._max.sortOrder ?? 0) + 1 },
  })
  return ok({ category }, 201)
})

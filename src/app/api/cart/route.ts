import crypto from 'crypto'
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { ApiError, ok, parseBody, route } from '@/lib/api'
import { getSettings, parseJsonArray, type OptionGroup } from '@/lib/catalog'
import { computeTotals, type CartLine } from '@/lib/pricing'

// --------------------------------------------------------------- helpers

export function optionsHashOf(labels: string[]): string {
  return crypto.createHash('md5').update([...labels].sort().join('|')).digest('hex')
}

/**
 * Validates client-selected option labels against the product's option
 * definition and prices them FROM THE DATABASE. Client-sent prices are ignored.
 */
export function priceOptions(productOptions: string, selectedLabels: string[]) {
  const groups = parseJsonArray<OptionGroup>(productOptions)
  const priced: { label: string; price: number }[] = []
  for (const label of selectedLabels) {
    let found: { label: string; price: number } | null = null
    for (const g of groups) {
      const c = g.choices.find((ch) => ch.label === label)
      if (c) { found = { label: c.label, price: c.price }; break }
    }
    if (!found) throw new ApiError(400, `"${label}" is not a valid option for this item`, 'BAD_OPTION')
    priced.push(found)
  }
  // enforce required groups
  for (const g of groups) {
    if (g.required && !g.multi) {
      const satisfied = selectedLabels.some((l) => g.choices.some((c) => c.label === l))
      if (!satisfied) throw new ApiError(400, `Please choose a "${g.group}" option`, 'OPTION_REQUIRED')
    }
  }
  return priced
}

export async function loadCart(userId: string, couponCode?: string | null) {
  const items = await db.cartItem.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    include: { product: { include: { category: { select: { name: true, slug: true } } } } },
  })

  const settings = await getSettings()

  let coupon = null as null | Awaited<ReturnType<typeof validateCouponRaw>>
  if (couponCode) {
    coupon = await validateCouponRaw(couponCode)
  }

  const lines: CartLine[] = []
  const serialized = items.map((item) => {
    const opts = parseJsonArray<{ label: string; price: number }>(item.options)
    const unitPrice = item.product.price + opts.reduce((s, o) => s + o.price, 0)
    lines.push({ unitPrice, quantity: item.quantity })
    return {
      id: item.id,
      quantity: item.quantity,
      notes: item.notes,
      options: opts,
      product: {
        id: item.product.id,
        name: item.product.name,
        slug: item.product.slug,
        image: item.product.image,
        price: item.product.price,
        isVeg: item.product.isVeg,
        isAvailable: item.product.isAvailable,
        category: item.product.category,
      },
      unitPrice,
      lineTotal: unitPrice * item.quantity,
    }
  })

  const totals = computeTotals({
    lines,
    coupon: coupon?.coupon ?? null,
    deliveryFee: settings.deliveryFee,
    freeDeliveryThreshold: settings.freeDeliveryThreshold,
    taxPercent: settings.taxPercent,
  })

  return { items: serialized, totals, coupon: coupon ? coupon.coupon : null }
}

export async function validateCouponRaw(code: string) {
  const coupon = await db.coupon.findUnique({ where: { code: code.toUpperCase() } })
  if (!coupon || !coupon.isActive) throw new ApiError(404, 'This coupon code is not valid', 'COUPON_INVALID')
  const now = new Date()
  if (coupon.validFrom > now) throw new ApiError(400, 'This coupon is not active yet', 'COUPON_NOT_ACTIVE')
  if (coupon.validUntil && coupon.validUntil < now) throw new ApiError(400, 'This coupon has expired', 'COUPON_EXPIRED')
  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
    throw new ApiError(400, 'This coupon has reached its usage limit', 'COUPON_LIMIT')
  }
  return {
    coupon: {
      code: coupon.code,
      type: coupon.type as 'PERCENT' | 'FLAT',
      value: coupon.value,
      minOrderValue: coupon.minOrderValue,
      maxDiscount: coupon.maxDiscount,
      description: coupon.description,
    },
    row: coupon,
  }
}

// --------------------------------------------------------------- routes

export const GET = route(async (req: NextRequest) => {
  const user = await requireUser(req)
  const couponCode = req.nextUrl.searchParams.get('coupon')
  const cart = await loadCart(user.id, couponCode)
  return ok(cart)
})

const addSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(10).default(1),
  options: z.array(z.string().trim().max(60)).max(8).default([]),
  notes: z.string().trim().max(200).optional().or(z.literal('')),
})

export const POST = route(async (req: NextRequest) => {
  const user = await requireUser(req)
  const body = await parseBody(req, addSchema)

  const product = await db.product.findUnique({ where: { id: body.productId } })
  if (!product) throw new ApiError(404, 'Product not found', 'NOT_FOUND')
  if (!product.isAvailable) throw new ApiError(400, 'This item is currently unavailable', 'UNAVAILABLE')

  const priced = priceOptions(product.options, body.options)
  const hash = optionsHashOf(priced.map((p) => p.label))

  const existing = await db.cartItem.findUnique({
    where: { userId_productId_optionsHash: { userId: user.id, productId: product.id, optionsHash: hash } },
  })

  if (existing) {
    const quantity = Math.min(10, existing.quantity + body.quantity)
    await db.cartItem.update({ where: { id: existing.id }, data: { quantity, notes: body.notes || existing.notes } })
  } else {
    await db.cartItem.create({
      data: {
        userId: user.id,
        productId: product.id,
        quantity: body.quantity,
        options: JSON.stringify(priced),
        optionsHash: hash,
        notes: body.notes || null,
      },
    })
  }

  return ok(await loadCart(user.id))
})

const patchSchema = z.object({
  itemId: z.string().min(1),
  quantity: z.number().int().min(0).max(10),
})

export const PATCH = route(async (req: NextRequest) => {
  const user = await requireUser(req)
  const body = await parseBody(req, patchSchema)

  const item = await db.cartItem.findUnique({ where: { id: body.itemId }, include: { product: true } })
  if (!item || item.userId !== user.id) throw new ApiError(404, 'Cart item not found', 'NOT_FOUND')
  if (body.quantity > 0 && !item.product.isAvailable) {
    throw new ApiError(400, 'This item is currently unavailable', 'UNAVAILABLE')
  }

  if (body.quantity === 0) {
    await db.cartItem.delete({ where: { id: body.itemId } })
  } else {
    await db.cartItem.update({ where: { id: body.itemId }, data: { quantity: body.quantity } })
  }
  return ok(await loadCart(user.id))
})

export const DELETE = route(async (req: NextRequest) => {
  const user = await requireUser(req)
  const itemId = req.nextUrl.searchParams.get('itemId')
  const all = req.nextUrl.searchParams.get('all')

  if (all === '1') {
    await db.cartItem.deleteMany({ where: { userId: user.id } })
  } else if (itemId) {
    const item = await db.cartItem.findUnique({ where: { id: itemId } })
    if (!item || item.userId !== user.id) throw new ApiError(404, 'Cart item not found', 'NOT_FOUND')
    await db.cartItem.delete({ where: { id: itemId } })
  } else {
    throw new ApiError(400, 'Provide itemId or all=1', 'BAD_REQUEST')
  }
  return ok(await loadCart(user.id))
})

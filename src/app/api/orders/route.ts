import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { ApiError, ok, parseBody, route } from '@/lib/api'
import { validateCouponRaw, loadCart } from '@/app/api/cart/route'
import { computeTotals } from '@/lib/pricing'
import { getSettings } from '@/lib/catalog'
import { buildOrderEvent, emitOrderEvent } from '@/lib/emit'
import crypto from 'crypto'

/**
 * POST /api/orders — create an order from the user's server-side cart.
 * All totals are recomputed from the database; the browser is never trusted.
 * Idempotency: the client sends an idempotencyKey; retries return the
 * original order instead of charging twice.
 */
const schema = z.object({
  idempotencyKey: z.string().min(8).max(64),
  addressId: z.string().optional(),
  address: z
    .object({
      label: z.string().trim().max(40).default('Home'),
      fullText: z.string().trim().min(8).max(300),
      city: z.string().trim().min(2).max(60),
      state: z.string().trim().min(2).max(60),
      pincode: z.string().trim().regex(/^\d{6}$/),
      phone: z.string().trim().regex(/^(\+91[\s-]?)?[6-9]\d{9}$/),
    })
    .optional(),
  contactName: z.string().trim().min(2).max(80),
  contactPhone: z.string().trim().regex(/^(\+91[\s-]?)?[6-9]\d{9}$/),
  instructions: z.string().trim().max(300).optional().or(z.literal('')),
  paymentMethod: z.enum(['RAZORPAY', 'COD']),
  couponCode: z.string().trim().max(30).optional().or(z.literal('')),
  saveAddress: z.boolean().optional(),
})

export const POST = route(async (req: NextRequest) => {
  const user = await requireUser(req)
  const body = await parseBody(req, schema)

  // ---- idempotency guard (payment row carries the key) ----
  const existingPayment = await db.payment.findUnique({
    where: { idempotencyKey: body.idempotencyKey },
    include: { order: { include: { items: true } } },
  })
  if (existingPayment) {
    return ok({ order: existingPayment.order, duplicate: true })
  }

  // ---- resolve delivery address ----
  let addressSnapshot: Record<string, string>
  if (body.addressId) {
    const a = await db.address.findUnique({ where: { id: body.addressId } })
    if (!a || a.userId !== user.id) throw new ApiError(400, 'Delivery address not found', 'BAD_ADDRESS')
    addressSnapshot = { label: a.label, fullText: a.fullText, city: a.city, state: a.state, pincode: a.pincode, phone: a.phone }
  } else if (body.address) {
    addressSnapshot = { ...body.address }
  } else {
    throw new ApiError(400, 'A delivery address is required', 'BAD_ADDRESS')
  }

  // ---- settings + coupon ----
  const settings = await getSettings()
  if (body.paymentMethod === 'COD' && !settings.codEnabled) {
    throw new ApiError(400, 'Cash on Delivery is currently unavailable. Please pay online.', 'COD_DISABLED')
  }
  const couponRow = body.couponCode ? await validateCouponRaw(body.couponCode) : null

  // ---- load cart & validate ----
  const cart = await loadCart(user.id, couponRow?.coupon.code)
  if (cart.items.length === 0) throw new ApiError(400, 'Your cart is empty', 'EMPTY_CART')

  const unavailable = cart.items.filter((i) => !i.product.isAvailable)
  if (unavailable.length > 0) {
    throw new ApiError(400, `Sorry — ${unavailable.map((i) => i.product.name).join(', ')} just went unavailable. Remove it to continue.`, 'ITEM_UNAVAILABLE')
  }

  // ---- recompute totals from DB prices (never trust the browser) ----
  const totals = computeTotals({
    lines: cart.items.map((i) => ({ unitPrice: i.unitPrice, quantity: i.quantity })),
    coupon: cart.coupon,
    deliveryFee: settings.deliveryFee,
    freeDeliveryThreshold: settings.freeDeliveryThreshold,
    taxPercent: settings.taxPercent,
  })

  const orderNumber = `UB${Date.now().toString(36).toUpperCase()}${crypto.randomInt(10, 99)}`

  const order = await db.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        orderNumber,
        userId: user.id,
        status: 'PLACED',
        paymentStatus: body.paymentMethod === 'COD' ? 'COD_PENDING' : 'PENDING',
        paymentMethod: body.paymentMethod,
        subtotal: totals.subtotal,
        discount: totals.discount,
        deliveryFee: totals.deliveryFee,
        tax: totals.tax,
        total: totals.total,
        couponCode: totals.couponApplied && couponRow ? couponRow.coupon.code : null,
        address: JSON.stringify(addressSnapshot),
        contactName: body.contactName,
        contactPhone: body.contactPhone,
        instructions: body.instructions || null,
        etaMinutes: settings.etaMinutes,
        items: {
          create: cart.items.map((i) => ({
            productId: i.product.id,
            name: i.product.name,
            image: i.product.image,
            unitPrice: i.unitPrice,
            quantity: i.quantity,
            options: JSON.stringify(i.options),
            lineTotal: i.lineTotal,
          })),
        },
      },
      include: { items: true },
    })

    // payment skeleton (idempotencyKey unique constraint protects against dupes)
    await tx.payment.create({
      data: {
        orderId: created.id,
        provider: body.paymentMethod === 'RAZORPAY' ? 'RAZORPAY' : 'RAZORPAY_DEV',
        amount: totals.total,
        status: body.paymentMethod === 'COD' ? 'COD_PENDING' : 'CREATED',
        idempotencyKey: body.idempotencyKey,
      },
    })

    if (totals.couponApplied && couponRow) {
      await tx.coupon.update({ where: { id: couponRow.row.id }, data: { usedCount: { increment: 1 } } })
    }
    for (const i of cart.items) {
      await tx.product.update({ where: { id: i.product.id }, data: { soldCount: { increment: i.quantity } } })
    }
    // optionally persist the entered address for future orders
    if (body.saveAddress && body.address) {
      const count = await tx.address.count({ where: { userId: user.id } })
      if (count === 0) await tx.address.create({ data: { ...body.address, isDefault: true, userId: user.id } })
    }
    await tx.cartItem.deleteMany({ where: { userId: user.id } })
    return created
  })

  // notify real-time listeners (after commit)
  await emitOrderEvent(buildOrderEvent(order, 'Order placed successfully'))

  return ok({ order, duplicate: false }, 201)
})

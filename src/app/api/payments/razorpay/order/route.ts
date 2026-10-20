import { NextRequest } from 'next/server'
import crypto from 'crypto'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { ApiError, ok, parseBody, route } from '@/lib/api'
import { createRazorpayOrder, publicKeyId, razorpayConfigured } from '@/lib/payments'

const schema = z.object({ orderId: z.string().min(5) })

/**
 * POST /api/payments/razorpay/order
 * Creates the gateway order for a PLACED order (idempotent).
 * When Razorpay keys are configured this calls the live test API;
 * otherwise it falls back to the local simulation gateway.
 */
export const POST = route(async (req: NextRequest) => {
  const user = await requireUser(req)
  const { orderId } = await parseBody(req, schema)

  const order = await db.order.findFirst({ where: { OR: [{ id: orderId }, { orderNumber: orderId }] } })
  if (!order) throw new ApiError(404, 'Order not found', 'NOT_FOUND')
  if (order.userId !== user.id) throw new ApiError(403, 'Not your order', 'FORBIDDEN')
  if (order.paymentMethod !== 'RAZORPAY') throw new ApiError(400, 'This order is not an online-payment order', 'BAD_METHOD')

  const payment = await db.payment.findFirst({
    where: { orderId: order.id },
    orderBy: { createdAt: 'desc' },
  })
  if (!payment) throw new ApiError(500, 'Payment record missing for this order', 'PAYMENT_MISSING')
  if (payment.status === 'PAID') throw new ApiError(409, 'This order is already paid', 'ALREADY_PAID')

  // idempotent: reuse an existing gateway order
  if (payment.providerOrderId) {
    return ok({
      gatewayOrderId: payment.providerOrderId,
      amount: payment.amount,
      currency: payment.currency,
      keyId: publicKeyId(),
      mode: razorpayConfigured() ? 'razorpay-test' : 'simulated-dev',
      paymentId: payment.id,
    })
  }

  const receipt = order.orderNumber
  if (razorpayConfigured()) {
    const rp = await createRazorpayOrder(payment.amount, receipt)
    await db.payment.update({ where: { id: payment.id }, data: { providerOrderId: rp.id } })
    return ok({
      gatewayOrderId: rp.id,
      amount: payment.amount,
      currency: payment.currency,
      keyId: publicKeyId(),
      mode: 'razorpay-test',
      paymentId: payment.id,
    })
  }

  // ---- local simulation gateway (dev fallback, clearly labelled in UI) ----
  const simOrderId = `order_sim_${crypto.randomUUID().replace(/-/g, '').slice(0, 14)}`
  await db.payment.update({ where: { id: payment.id }, data: { providerOrderId: simOrderId, provider: 'RAZORPAY_DEV' } })
  return ok({
    gatewayOrderId: simOrderId,
    amount: payment.amount,
    currency: payment.currency,
    keyId: '',
    mode: 'simulated-dev',
    paymentId: payment.id,
  })
})

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { ApiError, ok, parseBody, route } from '@/lib/api'
import { markPaymentFailed, markPaymentPaid, razorpayConfigured, razorpaySignature, simSignature, timingSafeEqual } from '@/lib/payments'

const schema = z.object({
  razorpay_order_id: z.string().min(5),
  razorpay_payment_id: z.string().min(5),
  razorpay_signature: z.string().min(16),
})

/**
 * POST /api/payments/razorpay/verify
 * Verifies the gateway signature server-side before ANY success is recorded.
 * A frontend "success" callback alone can never mark an order as paid.
 */
export const POST = route(async (req: NextRequest) => {
  const user = await requireUser(req)
  const body = await parseBody(req, schema)

  const payment = await db.payment.findFirst({
    where: { providerOrderId: body.razorpay_order_id },
    include: { order: true },
  })
  if (!payment) throw new ApiError(404, 'Unknown gateway order', 'NOT_FOUND')
  if (payment.order.userId !== user.id && user.role !== 'ADMIN') {
    throw new ApiError(403, 'Not your payment', 'FORBIDDEN')
  }

  const expected = razorpayConfigured()
    ? razorpaySignature(body.razorpay_order_id, body.razorpay_payment_id)
    : (payment.signature ?? simSignature(body.razorpay_order_id, body.razorpay_payment_id))

  const valid = timingSafeEqual(expected, body.razorpay_signature)
  if (!valid) {
    await markPaymentFailed(payment.id)
    throw new ApiError(400, 'Payment verification failed. If money was deducted it will auto-refund.', 'SIGNATURE_INVALID')
  }

  const { order, already } = await markPaymentPaid(payment.id, {
    providerPaymentId: body.razorpay_payment_id,
    signature: body.razorpay_signature,
  })

  return ok({ verified: true, alreadyProcessed: already, order })
})

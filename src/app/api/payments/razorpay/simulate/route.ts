import { NextRequest } from 'next/server'
import crypto from 'crypto'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { ApiError, ok, parseBody, route } from '@/lib/api'
import { razorpayConfigured } from '@/lib/payments'
import { simSignature } from '@/lib/payments'

/**
 * POST /api/payments/razorpay/simulate   [DEV SIMULATION GATEWAY]
 *
 * Available ONLY when Razorpay API keys are not configured. Acts as the
 * stand-in for the hosted checkout: the "customer pays" here and the server
 * issues a signed (paymentId, signature) pair — exactly like the real gateway
 * would. The client then verifies through /api/payments/razorpay/verify, the
 * same endpoint used with real Razorpay credentials.
 */
const schema = z.object({
  gatewayOrderId: z.string().min(5),
  outcome: z.enum(['success', 'failure']),
})

export const POST = route(async (req: NextRequest) => {
  if (razorpayConfigured()) {
    throw new ApiError(404, 'Simulation gateway is disabled when real Razorpay keys are configured', 'SIM_DISABLED')
  }
  const user = await requireUser(req)
  const body = await parseBody(req, schema)

  const payment = await db.payment.findFirst({ where: { providerOrderId: body.gatewayOrderId } })
  if (!payment) throw new ApiError(404, 'Gateway order not found', 'NOT_FOUND')

  const order = await db.order.findUnique({ where: { id: payment.orderId } })
  if (!order || order.userId !== user.id) throw new ApiError(403, 'Not your payment', 'FORBIDDEN')
  if (payment.status === 'PAID') throw new ApiError(409, 'Payment already completed', 'ALREADY_PAID')
  if (payment.status === 'FAILED' && body.outcome === 'success') {
    // allow retrying after a failure: re-arm the payment
    await db.payment.update({ where: { id: payment.id }, data: { status: 'CREATED' } })
  }

  if (body.outcome === 'failure') {
    await db.payment.update({ where: { id: payment.id }, data: { status: 'FAILED' } })
    return ok({ simulated: true, outcome: 'failure' })
  }

  const providerPaymentId = `pay_sim_${crypto.randomUUID().replace(/-/g, '').slice(0, 14)}`
  const signature = simSignature(payment.providerOrderId!, providerPaymentId)
  await db.payment.update({
    where: { id: payment.id },
    data: { providerPaymentId, signature, status: 'AUTHORIZED' },
  })

  return ok({
    simulated: true,
    outcome: 'success',
    razorpay_order_id: payment.providerOrderId,
    razorpay_payment_id: providerPaymentId,
    razorpay_signature: signature,
  })
})

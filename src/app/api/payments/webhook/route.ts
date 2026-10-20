import { NextRequest } from 'next/server'
import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ok, route } from '@/lib/api'
import { markPaymentFailed, markPaymentPaid, timingSafeEqual } from '@/lib/payments'

/**
 * POST /api/payments/webhook
 * Razorpay server-to-server webhook. Verifies X-Razorpay-Signature over the
 * RAW body with RAZORPAY_WEBHOOK_SECRET. Idempotent with the verify endpoint.
 * Disabled (503) until the webhook secret is configured.
 */
export const POST = route(async (req: NextRequest) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET
  if (!secret) {
    return NextResponse.json(
      { success: false, error: { code: 'WEBHOOK_DISABLED', message: 'Webhook secret not configured' } },
      { status: 503 },
    )
  }

  const raw = await req.text()
  const signature = req.headers.get('x-razorpay-signature') || ''
  const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex')
  if (!timingSafeEqual(expected, signature)) {
    return NextResponse.json(
      { success: false, error: { code: 'SIGNATURE_INVALID', message: 'Invalid webhook signature' } },
      { status: 400 },
    )
  }

  const event = JSON.parse(raw) as {
    event: string
    payload?: { payment?: { entity?: { id?: string; order_id?: string; method?: string } } }
  }

  const paymentEntity = event.payload?.payment?.entity
  if (paymentEntity?.order_id) {
    const payment = await db.payment.findFirst({ where: { providerOrderId: paymentEntity.order_id } })
    if (payment) {
      if (event.event === 'payment.captured' || event.event === 'payment.authorized') {
        await markPaymentPaid(payment.id, {
          providerPaymentId: paymentEntity.id,
          method: paymentEntity.method,
          signature: 'webhook',
        })
      } else if (event.event === 'payment.failed') {
        await markPaymentFailed(payment.id)
      }
    }
  }

  return ok({ received: true })
})

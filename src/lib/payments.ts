/**
 * Payment service — Razorpay test-mode integration with a clearly-labelled
 * local simulation fallback used when API keys are not configured.
 *
 * Real mode  : creates orders via the Razorpay REST API and verifies the
 *              HMAC-SHA256 signature `${order_id}|${payment_id}` with the key
 *              secret. A payment is marked successful ONLY after signature
 *              verification (client callbacks are never trusted).
 * Sim mode   : a local "gateway" authorises payments server-side and hands the
 *              client a signed token that goes through the exact same verify
 *              endpoint, so the merchant-side logic is identical.
 */
import crypto from 'crypto'
import { db } from '@/lib/db'
import { ApiError } from '@/lib/api'
import { buildOrderEvent, emitOrderEvent } from '@/lib/emit'

export function razorpayConfigured(): boolean {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET)
}

export function publicKeyId(): string {
  return process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || ''
}

export function razorpaySignature(orderId: string, paymentId: string): string {
  return crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
    .update(`${orderId}|${paymentId}`)
    .digest('hex')
}

export function simSignature(providerOrderId: string, providerPaymentId: string): string {
  const devSecret = `${process.env.INTERNAL_EMIT_SECRET || 'urban-bites-dev'}::${process.env.JWT_SECRET || 'urban-bites'}`
  return crypto.createHmac('sha256', devSecret).update(`${providerOrderId}|${providerPaymentId}`).digest('hex')
}

export function timingSafeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return crypto.timingSafeEqual(ab, bb)
}

export async function createRazorpayOrder(amount: number, receipt: string): Promise<{ id: string }> {
  const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64')
  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Basic ${auth}` },
    body: JSON.stringify({ amount, currency: 'INR', receipt, payment_capture: 1 }),
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new ApiError(502, `Razorpay rejected the order request (${res.status})`, 'GATEWAY_ERROR', text.slice(0, 300))
  }
  return (await res.json()) as { id: string }
}

/**
 * Marks a payment PAID idempotently. Safe to call multiple times
 * (from verify + webhook). Returns {already: true} when nothing changed.
 */
export async function markPaymentPaid(paymentId: string, details: { providerPaymentId?: string; signature?: string; method?: string }) {
  return db.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { id: paymentId } })
    if (!payment) throw new ApiError(404, 'Payment record not found', 'PAYMENT_NOT_FOUND')
    if (payment.status === 'PAID') {
      const order = await tx.order.findUnique({ where: { id: payment.orderId }, include: { items: true } })
      return { payment, order: order!, already: true }
    }
    if (payment.status === 'REFUNDED') {
      const order = await tx.order.findUnique({ where: { id: payment.orderId }, include: { items: true } })
      return { payment, order: order!, already: true }
    }

    const updated = await tx.payment.update({
      where: { id: paymentId },
      data: {
        status: 'PAID',
        providerPaymentId: details.providerPaymentId ?? payment.providerPaymentId,
        signature: details.signature ?? payment.signature,
        method: details.method ?? payment.method,
      },
    })
    const order = await tx.order.update({
      where: { id: payment.orderId },
      data: {
        paymentStatus: 'PAID',
        status: 'CONFIRMED', // paid & verified → kitchen can start
      },
      include: { items: true },
    })
    return { payment: updated, order, already: false }
  }).then(async (result) => {
    if (!result.already) {
      await emitOrderEvent(buildOrderEvent(result.order, 'Payment received — your order is confirmed!'))
    }
    return result
  })
}

export async function markPaymentFailed(paymentId: string) {
  const payment = await db.payment.findUnique({ where: { id: paymentId } })
  if (!payment) throw new ApiError(404, 'Payment record not found', 'PAYMENT_NOT_FOUND')
  if (payment.status === 'PAID') return payment
  return db.payment.update({ where: { id: paymentId }, data: { status: 'FAILED' } })
}

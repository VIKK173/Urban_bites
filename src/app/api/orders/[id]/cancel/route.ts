import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { ApiError, ok, parseBody, route } from '@/lib/api'
import { canCustomerCancel, STATUS_LABELS, type OrderStatus } from '@/lib/pricing'
import { buildOrderEvent, emitOrderEvent } from '@/lib/emit'

const schema = z.object({
  reason: z.string().trim().min(3).max(300).optional().or(z.literal('')),
})

export const PATCH = route(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser(req)
  const { id } = await ctx.params
  const body = await parseBody(req, schema)

  const order = await db.order.findFirst({ where: { OR: [{ id }, { orderNumber: id }] } })
  if (!order) throw new ApiError(404, 'Order not found', 'NOT_FOUND')
  if (order.userId !== user.id) throw new ApiError(403, 'You can only cancel your own orders', 'FORBIDDEN')

  const status = order.status as OrderStatus
  if (!canCustomerCancel(status)) {
    const msg =
      status === 'DELIVERED'
        ? 'Delivered orders cannot be cancelled. Contact support for refunds.'
        : status === 'CANCELLED'
          ? 'This order is already cancelled.'
          : `Too late to cancel — your order is ${STATUS_LABELS[status]}. Contact support for help.`
    throw new ApiError(400, msg, 'NOT_CANCELLABLE')
  }

  const wasPaid = order.paymentStatus === 'PAID'

  const updated = await db.$transaction(async (tx) => {
    const o = await tx.order.update({
      where: { id: order.id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelReason: body.reason || 'Cancelled by customer',
        paymentStatus: wasPaid ? 'REFUNDED' : order.paymentStatus,
      },
      include: { items: true },
    })
    if (wasPaid) {
      await tx.payment.updateMany({
        where: { orderId: order.id, status: 'PAID' },
        data: { status: 'REFUNDED' },
      })
    }
    return o
  })

  await emitOrderEvent(buildOrderEvent(updated, wasPaid ? 'Order cancelled — your payment will be refunded in 3-5 business days.' : 'Order cancelled'))
  return ok({ order: updated })
})

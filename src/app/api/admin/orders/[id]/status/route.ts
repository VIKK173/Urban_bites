import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ApiError, ok, parseBody, route } from '@/lib/api'
import { canAdminTransition, STATUS_LABELS, type OrderStatus } from '@/lib/pricing'
import { buildOrderEvent, emitOrderEvent } from '@/lib/emit'

const schema = z.object({
  status: z.enum(['PLACED', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED']),
  reason: z.string().trim().max(300).optional().or(z.literal('')),
})

export const PATCH = route(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  await requireAdmin(req)
  const { id } = await ctx.params
  const body = await parseBody(req, schema)

  const order = await db.order.findFirst({ where: { OR: [{ id }, { orderNumber: id }] } })
  if (!order) throw new ApiError(404, 'Order not found', 'NOT_FOUND')

  const from = order.status as OrderStatus
  if (from === body.status) {
    return ok({ order, unchanged: true })
  }
  if (!canAdminTransition(from, body.status)) {
    throw new ApiError(
      400,
      `Cannot move an order from ${STATUS_LABELS[from]} to ${STATUS_LABELS[body.status]}`,
      'INVALID_TRANSITION',
    )
  }

  const updated = await db.$transaction(async (tx) => {
    const o = await tx.order.update({
      where: { id: order.id },
      data: {
        status: body.status,
        deliveredAt: body.status === 'DELIVERED' ? new Date() : undefined,
        cancelledAt: body.status === 'CANCELLED' ? new Date() : undefined,
        cancelReason: body.status === 'CANCELLED' ? body.reason || 'Cancelled by restaurant' : undefined,
        // cancelling a COD order that was never paid keeps COD_PENDING; a paid online order gets refunded
        paymentStatus:
          body.status === 'CANCELLED' && order.paymentStatus === 'PAID'
            ? 'REFUNDED'
            : body.status === 'CANCELLED' && order.paymentStatus === 'COD_PENDING'
              ? 'COD_PENDING'
              : order.paymentStatus,
      },
      include: { items: true },
    })
    if (body.status === 'CANCELLED' && order.paymentStatus === 'PAID') {
      await tx.payment.updateMany({ where: { orderId: order.id, status: 'PAID' }, data: { status: 'REFUNDED' } })
    }
    return o
  })

  await emitOrderEvent(
    buildOrderEvent(
      updated,
      body.status === 'CANCELLED'
        ? `Order cancelled by restaurant. ${body.reason || ''}`.trim()
        : `Your order is ${STATUS_LABELS[body.status]}`,
    ),
  )
  return ok({ order: updated })
})

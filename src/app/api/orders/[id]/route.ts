import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ApiError, ok, route } from '@/lib/api'
import { requireUser } from '@/lib/auth'
import { buildOrderEvent, emitOrderEvent } from '@/lib/emit'

/**
 * GET /api/orders/:id — id or orderNumber.
 * Customers may only read their own orders; admins can read any.
 */
export const GET = route(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser(req)
  const { id } = await ctx.params

  const order = await db.order.findFirst({
    where: { OR: [{ id }, { orderNumber: id }] },
    include: {
      items: true,
      payments: { orderBy: { createdAt: 'desc' }, take: 5 },
    },
  })
  if (!order) throw new ApiError(404, 'Order not found', 'NOT_FOUND')
  if (order.userId !== user.id && user.role !== 'ADMIN') {
    throw new ApiError(403, 'You do not have access to this order', 'FORBIDDEN')
  }

  // lazily replay the latest status as a real-time event (helps reconnects)
  if (user.id === order.userId) {
    await emitOrderEvent(buildOrderEvent(order))
  }

  return ok({ order })
})

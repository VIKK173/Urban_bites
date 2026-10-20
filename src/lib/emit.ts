/**
 * Internal event emitter — pushes order events to the Socket.IO
 * order-tracking mini service (server-to-server, never exposed to browsers).
 */
import { ORDER_STATUSES, STATUS_LABELS, type OrderStatus } from './pricing'

const SOCKET_INTERNAL_URL = `http://localhost:${process.env.SOCKET_INTERNAL_PORT || 3013}`

export type OrderEventType =
  | 'order.placed'
  | 'order.confirmed'
  | 'order.preparing'
  | 'order.ready'
  | 'order.out_for_delivery'
  | 'order.delivered'
  | 'order.cancelled'

const EVENT_BY_STATUS: Record<OrderStatus, OrderEventType> = {
  PLACED: 'order.placed',
  CONFIRMED: 'order.confirmed',
  PREPARING: 'order.preparing',
  READY: 'order.ready',
  OUT_FOR_DELIVERY: 'order.out_for_delivery',
  DELIVERED: 'order.delivered',
  CANCELLED: 'order.cancelled',
}

export interface OrderEventPayload {
  orderId: string
  orderNumber: string
  userId: string
  status: OrderStatus
  statusLabel: string
  eventType: OrderEventType
  etaMinutes?: number
  message?: string
  at: string
}

export function buildOrderEvent(order: {
  id: string; orderNumber: string; userId: string; status: string; etaMinutes?: number
}, message?: string): OrderEventPayload {
  const status = (ORDER_STATUSES as readonly string[]).includes(order.status)
    ? (order.status as OrderStatus)
    : 'PLACED'
  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    userId: order.userId,
    status,
    statusLabel: STATUS_LABELS[status],
    eventType: EVENT_BY_STATUS[status],
    etaMinutes: order.etaMinutes,
    message,
    at: new Date().toISOString(),
  }
}

/** Fire-and-forget emit; failures never break the main request. */
export async function emitOrderEvent(event: OrderEventPayload): Promise<void> {
  try {
    await fetch(`${SOCKET_INTERNAL_URL}/internal/emit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: process.env.INTERNAL_EMIT_SECRET,
        rooms: [`order:${event.orderId}`, `user:${event.userId}`, 'admin'],
        event: 'order:update',
        data: event,
      }),
      signal: AbortSignal.timeout(2000),
    })
  } catch (err) {
    console.warn('[emit] socket service unreachable, event dropped:', (err as Error).message)
  }
}

/**
 * Pricing engine — pure functions shared by the cart, checkout, orders API
 * and automated tests. All amounts in integer paise.
 */
import { formatINR } from './money'

export interface CartLine {
  unitPrice: number // unit price incl. options, paise
  quantity: number
  name?: string
}

export interface CouponLike {
  code: string
  type: 'PERCENT' | 'FLAT'
  value: number // percent (1-100) or paise
  minOrderValue: number // paise
  maxDiscount?: number | null // paise cap for PERCENT
}

export interface TotalsInput {
  lines: CartLine[]
  coupon?: CouponLike | null
  deliveryFee: number // paise
  freeDeliveryThreshold: number // paise (applies on subtotal-discount)
  taxPercent: number // e.g. 5 => 5%
}

export interface Totals {
  subtotal: number
  discount: number
  deliveryFee: number
  tax: number
  total: number
  couponApplied: boolean
  couponMessage?: string
}

export function computeSubtotal(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0)
}

/** Returns discount in paise, or null when the coupon is not eligible. */
export function computeCouponDiscount(coupon: CouponLike, subtotal: number): number | null {
  if (subtotal <= 0) return null
  if (subtotal < coupon.minOrderValue) return null
  if (coupon.type === 'FLAT') {
    return Math.min(coupon.value, subtotal)
  }
  const raw = Math.round((subtotal * coupon.value) / 100)
  return Math.min(coupon.maxDiscount ?? raw, raw, subtotal)
}

export function computeTotals(input: TotalsInput): Totals {
  const subtotal = computeSubtotal(input.lines)
  let discount = 0
  let couponApplied = false
  let couponMessage: string | undefined

  if (input.coupon) {
    const d = computeCouponDiscount(input.coupon, subtotal)
    if (d === null) {
      couponMessage =
        subtotal < input.coupon.minOrderValue
          ? `Add ${formatINR(input.coupon.minOrderValue - subtotal)} more to use ${input.coupon.code}`
          : `${input.coupon.code} is not applicable`
    } else {
      discount = d
      couponApplied = true
    }
  }

  const net = subtotal - discount
  const deliveryFee = net > 0 && net >= input.freeDeliveryThreshold ? 0 : input.deliveryFee
  const tax = Math.round((net * input.taxPercent) / 100)
  const total = Math.max(0, net + deliveryFee + tax)

  return { subtotal, discount, deliveryFee, tax, total, couponApplied, couponMessage }
}

/** Order status transition rules (customer + admin). */
export const ORDER_STATUSES = ['PLACED', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

export const ADMIN_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PLACED: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY', 'CANCELLED'],
  READY: ['OUT_FOR_DELIVERY', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
}

/** Customers may cancel until the kitchen starts cooking (or if already delivered/cancelled). */
export const CUSTOMER_CANCELLABLE: OrderStatus[] = ['PLACED', 'CONFIRMED']

export function canAdminTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ADMIN_TRANSITIONS[from]?.includes(to) ?? false
}

export function canCustomerCancel(status: OrderStatus): boolean {
  return CUSTOMER_CANCELLABLE.includes(status)
}

export const STATUS_LABELS: Record<OrderStatus, string> = {
  PLACED: 'Order Placed',
  CONFIRMED: 'Confirmed',
  PREPARING: 'Preparing',
  READY: 'Ready for Pickup',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
}

'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Check, ClipboardCheck, ChefHat, PackageCheck, Bike, Home, X, Timer, MapPin, Phone,
  Receipt, Ban,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuthStore } from '@/store/auth-store'
import { get, patch } from '@/services/api'
import { getOrderSocket, type OrderUpdate } from '@/services/socket'
import { navigate } from '@/hooks/useHashRoute'
import { formatINR } from '@/lib/money'
import { toast } from 'sonner'

interface OrderItem {
  id: string
  name: string
  image: string | null
  unitPrice: number
  quantity: number
  options: string
  lineTotal: number
}

interface Order {
  id: string
  orderNumber: string
  status: string
  paymentStatus: string
  paymentMethod: string
  subtotal: number
  discount: number
  deliveryFee: number
  tax: number
  total: number
  couponCode: string | null
  address: string
  contactName: string
  contactPhone: string
  instructions: string | null
  etaMinutes: number
  cancelReason: string | null
  placedAt: string
  createdAt: string
  items: OrderItem[]
}

const TIMELINE = [
  { status: 'PLACED', label: 'Order Placed', icon: ClipboardCheck, hint: 'We got your order' },
  { status: 'CONFIRMED', label: 'Confirmed', icon: Check, hint: 'Payment verified & accepted' },
  { status: 'PREPARING', label: 'Preparing', icon: ChefHat, hint: 'The kitchen is on it' },
  { status: 'READY', label: 'Ready', icon: PackageCheck, hint: 'Packed and waiting' },
  { status: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', icon: Bike, hint: 'Rider on the way' },
  { status: 'DELIVERED', label: 'Delivered', icon: Home, hint: 'Enjoy your meal!' },
]

export default function OrderTrackingPage({ orderRef }: { orderRef: string }) {
  const { user, status: authStatus } = useAuthStore()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [live, setLive] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [etaLeft, setEtaLeft] = useState<string>('')
  const notified = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (authStatus === 'guest') navigate('/login')
  }, [authStatus])

  useEffect(() => {
    if (!user) return
    setLoading(true)
    get<{ order: Order }>(`/api/orders/${encodeURIComponent(orderRef)}`)
      .then((d) => {
        setOrder(d.order)
        notified.current.add(d.order.status)
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [orderRef, user])

  // ---- real-time updates (with reconnect recovery) ----
  useEffect(() => {
    if (!order) return
    let active = true
    let cleanup: (() => void) | undefined

    const subscribe = (s: Awaited<ReturnType<typeof getOrderSocket>>) => {
      s.emit('order:subscribe', { orderId: order.id })
      setLive(true)
    }

    getOrderSocket()
      .then((s) => {
        if (!active) return
        const onUpdate = (u: OrderUpdate) => {
          if (u.orderId !== order.id) return
          setOrder((prev) => (prev ? { ...prev, status: u.status } : prev))
          if (!notified.current.has(u.status)) {
            notified.current.add(u.status)
            if (u.status === 'CANCELLED') toast.error(u.message || 'Order cancelled')
            else toast.success(u.message || `Order update: ${u.statusLabel}`)
          }
        }
        s.on('order:update', onUpdate)
        subscribe(s)

        // after a service/gateway restart: re-subscribe and refetch missed state
        const onReady = () => {
          if (!active) return
          subscribe(s)
          get<{ order: Order }>(`/api/orders/${encodeURIComponent(orderRef)}`)
            .then((d) => active && setOrder(d.order))
            .catch(() => {})
        }
        window.addEventListener('ub:socket-ready', onReady)

        cleanup = () => {
          window.removeEventListener('ub:socket-ready', onReady)
          s.off('order:update', onUpdate)
        }
      })
      .catch(() => setLive(false))

    return () => {
      active = false
      cleanup?.()
    }
  }, [order?.id])

  // ---- ETA countdown ----
  useEffect(() => {
    if (!order || order.status === 'DELIVERED' || order.status === 'CANCELLED') return
    const placed = new Date(order.placedAt || order.createdAt).getTime()
    const target = placed + order.etaMinutes * 60_000
    const tick = () => {
      const diff = target - Date.now()
      if (diff <= 0) return setEtaLeft('Arriving any moment')
      const m = Math.floor(diff / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setEtaLeft(`${m}m ${String(s).padStart(2, '0')}s`)
    }
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [order])

  const cancelOrder = async () => {
    if (!order) return
    setCancelling(true)
    try {
      await patch(`/api/orders/${order.id}/cancel`, { reason: 'Changed my mind' })
      toast.success('Order cancelled')
      const d = await get<{ order: Order }>(`/api/orders/${order.id}`)
      setOrder(d.order)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setCancelling(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-14 space-y-6">
        <Skeleton className="h-24 rounded-2xl bg-white/5" />
        <Skeleton className="h-64 rounded-2xl bg-white/5" />
        <Skeleton className="h-40 rounded-2xl bg-white/5" />
      </div>
    )
  }

  if (notFound || !order) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="font-display text-2xl font-bold">Order not found</h1>
        <p className="mt-2 text-sm text-neutral-500">Check the link, or view all your orders.</p>
        <Button onClick={() => navigate('/orders')} className="mt-6 rounded-full bg-primary text-white px-8">My Orders</Button>
      </div>
    )
  }

  const isCancelled = order.status === 'CANCELLED'
  const isDelivered = order.status === 'DELIVERED'
  const currentIdx = TIMELINE.findIndex((t) => t.status === order.status)
  const address = JSON.parse(order.address || '{}') as { fullText?: string; city?: string; pincode?: string }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10 sm:py-14">
      {/* header card */}
      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#1a1a1a] to-[#111] p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-56 h-56 bg-primary/15 blur-[80px] rounded-full" aria-hidden />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Order</p>
            <h1 className="font-display mt-1 text-3xl font-bold">{order.orderNumber}</h1>
            <p className="mt-1 text-sm text-neutral-500">
              {new Date(order.placedAt || order.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
            </p>
          </div>
          <div className="text-right">
            <span
              className={`inline-block rounded-full px-4 py-1.5 text-sm font-bold ${
                isCancelled
                  ? 'bg-red-500/15 text-red-400'
                  : isDelivered
                    ? 'bg-green-500/15 text-green-400'
                    : 'bg-primary/15 text-primary'
              }`}
            >
              {order.status.replace(/_/g, ' ')}
            </span>
            {live && !isCancelled && !isDelivered && (
              <p className="mt-2 text-[11px] text-neutral-500 flex items-center gap-1.5 justify-end">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" aria-hidden /> Live updates on
              </p>
            )}
          </div>
        </div>

        {!isCancelled && !isDelivered && (
          <div className="relative mt-6 flex items-center gap-3 rounded-2xl bg-white/5 p-4">
            <Timer className="w-5 h-5 text-primary shrink-0" aria-hidden />
            <div>
              <p className="text-sm font-semibold">{etaLeft || `~${order.etaMinutes} minutes`}</p>
              <p className="text-xs text-neutral-500">Estimated delivery window</p>
            </div>
          </div>
        )}
        {isCancelled && order.cancelReason && (
          <p className="relative mt-6 rounded-2xl bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-300">
            {order.cancelReason}
            {order.paymentStatus === 'REFUNDED' && ' Any paid amount will be refunded in 3–5 business days.'}
          </p>
        )}
      </div>

      {/* timeline */}
      {!isCancelled ? (
        <section className="mt-8 rounded-2xl bg-card border border-white/5 p-6" aria-label="Order progress">
          <h2 className="font-display text-lg font-semibold">Order progress</h2>
          <ol className="mt-5 relative">
            {TIMELINE.map((t, i) => {
              const done = i <= currentIdx
              const active = i === currentIdx
              return (
                <li key={t.status} className="relative flex gap-4 pb-8 last:pb-0">
                  {i < TIMELINE.length - 1 && (
                    <span
                      className={`absolute left-[17px] top-9 bottom-0 w-0.5 ${i < currentIdx ? 'bg-primary' : 'bg-white/10'}`}
                      aria-hidden
                    />
                  )}
                  <span
                    className={`relative z-10 grid place-items-center w-9 h-9 rounded-full shrink-0 transition-colors ${
                      done ? 'bg-primary text-white' : 'bg-white/5 text-neutral-600 border border-white/10'
                    } ${active ? 'glow-red' : ''}`}
                  >
                    <t.icon className={`w-4 h-4 ${active && !reduceMotionSafe() ? 'animate-pulse' : ''}`} aria-hidden />
                  </span>
                  <div className="pt-1">
                    <p className={`text-sm font-semibold ${done ? 'text-white' : 'text-neutral-500'}`}>{t.label}</p>
                    <p className="text-xs text-neutral-600 mt-0.5">{t.hint}</p>
                  </div>
                  {active && (
                    <span className="ml-auto self-center text-[11px] font-bold uppercase tracking-widest text-primary">Now</span>
                  )}
                </li>
              )
            })}
          </ol>
        </section>
      ) : (
        <section className="mt-8 rounded-2xl bg-card border border-red-500/20 p-6" aria-label="Order cancelled">
          <h2 className="font-display text-lg font-semibold flex items-center gap-2 text-red-400"><X className="w-5 h-5" /> Order cancelled</h2>
          <p className="mt-2 text-sm text-neutral-400">This order will not be prepared or delivered. Questions? Visit our <a href="#/support" className="text-primary">support page</a>.</p>
        </section>
      )}

      {/* items + bill */}
      <section className="mt-8 rounded-2xl bg-card border border-white/5 p-6" aria-label="Order details">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Order details</h2>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${order.paymentStatus === 'PAID' ? 'bg-green-500/15 text-green-400' : order.paymentStatus === 'REFUNDED' ? 'bg-amber-500/15 text-amber-400' : 'bg-white/10 text-neutral-300'}`}>
            {order.paymentMethod === 'COD' ? 'Cash on Delivery' : 'Online'} · {order.paymentStatus.replace(/_/g, ' ')}
          </span>
        </div>
        <ul className="mt-4 divide-y divide-white/5">
          {order.items.map((i) => {
            const opts = JSON.parse(i.options || '[]') as { label: string }[]
            return (
              <li key={i.id} className="flex items-center gap-3 py-3">
                { }
                <img src={i.image || '/images/placeholder.png'} alt="" className="w-12 h-12 rounded-lg object-cover bg-white/5" loading="lazy" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{i.quantity} × {i.name}</p>
                  {opts.length > 0 && <p className="text-xs text-neutral-500">{opts.map((o) => o.label).join(' · ')}</p>}
                </div>
                <p className="text-sm font-bold">{formatINR(i.lineTotal)}</p>
              </li>
            )
          })}
        </ul>
        <Separator className="my-4 bg-white/5" />
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between text-neutral-400"><dt>Subtotal</dt><dd>{formatINR(order.subtotal)}</dd></div>
          {order.discount > 0 && (
            <div className="flex justify-between text-green-400"><dt>Coupon {order.couponCode}</dt><dd>−{formatINR(order.discount)}</dd></div>
          )}
          <div className="flex justify-between text-neutral-400">
            <dt>Delivery</dt>
            <dd>{order.deliveryFee === 0 ? 'FREE' : formatINR(order.deliveryFee)}</dd>
          </div>
          <div className="flex justify-between text-neutral-400"><dt>Taxes</dt><dd>{formatINR(order.tax)}</dd></div>
          <Separator className="my-2 bg-white/5" />
          <div className="flex justify-between text-base font-bold"><dt>Total</dt><dd>{formatINR(order.total)}</dd></div>
        </dl>
      </section>

      {/* delivery info + actions */}
      <section className="mt-8 grid sm:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-card border border-white/5 p-5 text-sm text-neutral-300 space-y-2">
          <h2 className="font-display text-base font-semibold text-white flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> Delivering to</h2>
          <p>{address.fullText}, {address.city} — {address.pincode}</p>
          <p className="flex items-center gap-2 text-neutral-400"><Phone className="w-3.5 h-3.5" /> {order.contactName} · {order.contactPhone}</p>
          {order.instructions && <p className="text-xs text-neutral-500 italic">“{order.instructions}”</p>}
        </div>
        <div className="rounded-2xl bg-card border border-white/5 p-5 text-sm text-neutral-300 space-y-3">
          <h2 className="font-display text-base font-semibold text-white flex items-center gap-2"><Receipt className="w-4 h-4 text-primary" /> Need help?</h2>
          <p className="text-neutral-500 text-xs leading-relaxed">Wrong item, late delivery or refund question — we&apos;ve got you.</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/support')} className="rounded-full border-white/15 text-white h-9 text-xs">Visit support</Button>
            {['PLACED', 'CONFIRMED'].includes(order.status) && (
              <Button variant="outline" onClick={cancelOrder} disabled={cancelling} className="rounded-full border-red-500/40 text-red-400 h-9 text-xs">
                <Ban className="w-3.5 h-3.5 mr-1" /> {cancelling ? 'Cancelling…' : 'Cancel order'}
              </Button>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

function reduceMotionSafe() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

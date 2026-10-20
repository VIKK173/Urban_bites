'use client'

import { useEffect, useState } from 'react'
import { Package, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuthStore } from '@/store/auth-store'
import { get } from '@/services/api'
import { navigate } from '@/hooks/useHashRoute'
import { formatINR } from '@/lib/money'

interface OrderSummary {
  id: string
  orderNumber: string
  status: string
  paymentStatus: string
  paymentMethod: string
  total: number
  createdAt: string
  items: { id: string; name: string; quantity: number; image: string | null }[]
}

const STATUS_COLORS: Record<string, string> = {
  PLACED: 'bg-amber-500/15 text-amber-400',
  CONFIRMED: 'bg-blue-500/15 text-blue-400',
  PREPARING: 'bg-purple-500/15 text-purple-400',
  READY: 'bg-cyan-500/15 text-cyan-400',
  OUT_FOR_DELIVERY: 'bg-primary/15 text-primary',
  DELIVERED: 'bg-green-500/15 text-green-400',
  CANCELLED: 'bg-red-500/15 text-red-400',
}

export default function OrdersPage() {
  const { user, status } = useAuthStore()
  const [orders, setOrders] = useState<OrderSummary[] | null>(null)

  useEffect(() => {
    if (status === 'guest') navigate('/login')
  }, [status])

  useEffect(() => {
    if (!user) return
    get<{ orders: OrderSummary[] }>('/api/orders/my?limit=20')
      .then((d) => setOrders(d.orders))
      .catch(() => setOrders([]))
  }, [user])

  if (!user) return <div className="py-24 text-center text-sm text-neutral-500">Loading…</div>

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10 sm:py-14">
      <h1 className="font-display text-3xl sm:text-4xl font-bold">MY ORDERS</h1>
      <p className="mt-1.5 text-sm text-neutral-500">Every feast, tracked from fryer to doorstep.</p>

      <div className="mt-8 space-y-4">
        {orders === null &&
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl bg-white/5" />)}

        {orders?.length === 0 && (
          <div className="py-16 text-center rounded-2xl border border-dashed border-white/10">
            <Package className="mx-auto w-10 h-10 text-neutral-600" aria-hidden />
            <h2 className="mt-4 font-display text-xl font-semibold">No orders yet</h2>
            <p className="mt-2 text-sm text-neutral-500">Your order history will appear here after your first feast.</p>
            <Button onClick={() => navigate('/menu')} className="mt-5 rounded-full bg-primary text-white px-8">Start an order</Button>
          </div>
        )}

        {orders?.map((o) => (
          <button
            key={o.id}
            onClick={() => navigate(`/order/${o.orderNumber}`)}
            className="w-full text-left rounded-2xl bg-card border border-white/5 p-4 hover:border-primary/40 transition-colors group"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex -space-x-3">
                  {o.items.slice(0, 3).map((i) => (
                     
                    <img
                      key={i.id}
                      src={i.image || '/images/placeholder.png'}
                      alt=""
                      className="w-11 h-11 rounded-xl object-cover border-2 border-card bg-white/5"
                      loading="lazy"
                    />
                  ))}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold">{o.orderNumber}</p>
                  <p className="text-xs text-neutral-500 truncate">
                    {o.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}
                  </p>
                  <p className="text-[11px] text-neutral-600 mt-0.5">
                    {new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-bold ${STATUS_COLORS[o.status] || 'bg-white/10 text-white'}`}>
                  {o.status.replace(/_/g, ' ')}
                </span>
                <p className="mt-1.5 font-bold">{formatINR(o.total)}</p>
                <p className="text-[11px] text-neutral-500 flex items-center gap-0.5 justify-end group-hover:text-primary transition-colors">
                  Track <ChevronRight className="w-3 h-3" />
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

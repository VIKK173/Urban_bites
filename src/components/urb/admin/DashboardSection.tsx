'use client'

import { useEffect, useState } from 'react'
import {
  IndianRupee, ShoppingCart, Hourglass, CheckCircle2, TrendingUp, ArrowRight,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { get } from '@/services/api'
import { formatINR } from '@/lib/money'
import { STATUS_LABELS, type OrderStatus } from '@/lib/pricing'

interface Dashboard {
  stats: {
    totalOrders: number
    pendingOrders: number
    completedOrders: number
    cancelledOrders: number
    totalCustomers: number
    totalProducts: number
    totalRevenue: number
  }
  statusCounts: { status: string; count: number }[]
  recentOrders: {
    id: string
    orderNumber: string
    status: string
    paymentStatus: string
    total: number
    createdAt: string
    itemCount: number
    customer: string
    customerEmail: string
  }[]
  topItems: { name: string; quantity: number; revenue: number; image: string | null }[]
}

export default function DashboardSection({ onGoOrders }: { onGoOrders: () => void }) {
  const [data, setData] = useState<Dashboard | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    get<Dashboard>('/api/admin/dashboard').then(setData).catch((e) => setError(e.message))
  }, [])

  if (error) return <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{error}</p>
  if (!data) {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl bg-white/5" />)}</div>
        <Skeleton className="h-72 rounded-2xl bg-white/5" />
      </div>
    )
  }

  const s = data.stats
  const cards = [
    { icon: IndianRupee, label: 'Total Revenue', value: formatINR(s.totalRevenue), sub: 'verified payments', accent: 'text-green-400 bg-green-500/10' },
    { icon: ShoppingCart, label: 'Total Orders', value: String(s.totalOrders), sub: `${s.cancelledOrders} cancelled`, accent: 'text-primary bg-primary/10' },
    { icon: Hourglass, label: 'Pending Orders', value: String(s.pendingOrders), sub: 'in the pipeline now', accent: 'text-amber-400 bg-amber-500/10' },
    { icon: CheckCircle2, label: 'Completed', value: String(s.completedOrders), sub: `${s.totalCustomers} customers served`, accent: 'text-blue-400 bg-blue-500/10' },
  ]

  return (
    <div className="space-y-6">
      {/* stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl bg-card border border-white/5 p-5">
            <span className={`grid place-items-center w-9 h-9 rounded-lg ${c.accent}`}>
              <c.icon className="w-4.5 h-4.5 w-[18px] h-[18px]" aria-hidden />
            </span>
            <p className="mt-3 text-2xl font-bold">{c.value}</p>
            <p className="text-xs font-medium text-neutral-300 mt-0.5">{c.label}</p>
            <p className="text-[11px] text-neutral-600 mt-0.5">{c.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* recent orders */}
        <section className="rounded-2xl bg-card border border-white/5 p-5" aria-labelledby="recent-orders-heading">
          <div className="flex items-center justify-between">
            <h2 id="recent-orders-heading" className="font-display text-lg font-semibold">Recent orders</h2>
            <button onClick={onGoOrders} className="text-xs font-semibold text-primary flex items-center gap-1 hover:gap-2 transition-all">
              Manage all <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <ul className="mt-4 divide-y divide-white/5">
            {data.recentOrders.map((o) => (
              <li key={o.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{o.orderNumber} <span className="text-neutral-500 font-normal">· {o.itemCount} items</span></p>
                  <p className="text-xs text-neutral-500 truncate">{o.customer} · {new Date(o.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold">{formatINR(o.total)}</p>
                  <p className="text-[11px] text-neutral-500">{STATUS_LABELS[o.status as OrderStatus] || o.status}</p>
                </div>
              </li>
            ))}
            {data.recentOrders.length === 0 && <li className="py-6 text-center text-sm text-neutral-500">No orders yet.</li>}
          </ul>
        </section>

        {/* top items */}
        <section className="rounded-2xl bg-card border border-white/5 p-5" aria-labelledby="top-items-heading">
          <h2 id="top-items-heading" className="font-display text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" /> Popular items
          </h2>
          <ul className="mt-4 divide-y divide-white/5">
            {data.topItems.map((t, i) => (
              <li key={t.name} className="py-2.5 flex items-center gap-3">
                <span className="w-6 text-center text-sm font-bold text-neutral-600">{i + 1}</span>
                { }
                <img src={t.image || '/images/placeholder.png'} alt="" className="w-10 h-10 rounded-lg object-cover bg-white/5" loading="lazy" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{t.name}</p>
                  <p className="text-xs text-neutral-500">{t.quantity} sold · {formatINR(t.revenue)} revenue</p>
                </div>
              </li>
            ))}
            {data.topItems.length === 0 && <li className="py-6 text-center text-sm text-neutral-500">No sales data yet.</li>}
          </ul>
        </section>
      </div>
    </div>
  )
}

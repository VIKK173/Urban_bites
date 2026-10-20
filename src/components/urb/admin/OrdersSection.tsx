'use client'

import { useCallback, useEffect, useState } from 'react'
import { Search, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useAuthStore } from '@/store/auth-store'
import { get, patch } from '@/services/api'
import { formatINR } from '@/lib/money'
import { ORDER_STATUSES, STATUS_LABELS, ADMIN_TRANSITIONS, type OrderStatus } from '@/lib/pricing'
import { getOrderSocket } from '@/services/socket'
import { toast } from 'sonner'

interface AdminOrder {
  id: string
  orderNumber: string
  status: OrderStatus
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
  createdAt: string
  user: { name: string; email: string }
  items: { id: string; name: string; quantity: number; unitPrice: number; lineTotal: number; options: string }[]
  payments: { id: string; status: string; provider: string; method: string | null }[]
}

const STATUS_BADGE: Record<string, string> = {
  PLACED: 'bg-amber-500/15 text-amber-400',
  CONFIRMED: 'bg-blue-500/15 text-blue-400',
  PREPARING: 'bg-purple-500/15 text-purple-400',
  READY: 'bg-cyan-500/15 text-cyan-400',
  OUT_FOR_DELIVERY: 'bg-primary/15 text-primary',
  DELIVERED: 'bg-green-500/15 text-green-400',
  CANCELLED: 'bg-red-500/15 text-red-400',
}

export default function OrdersSection() {
  const user = useAuthStore((s) => s.user)
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [detail, setDetail] = useState<AdminOrder | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '12' })
      if (search.trim()) params.set('search', search.trim())
      if (statusFilter !== 'all') params.set('status', statusFilter)
      const d = await get<{ orders: AdminOrder[]; pagination: { totalPages: number } }>(`/api/admin/orders?${params}`)
      setOrders(d.orders)
      setTotalPages(d.pagination.totalPages)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter])

  useEffect(() => {
    const t = setTimeout(load, 250)
    return () => clearTimeout(t)
  }, [load])

  // live refresh when any order updates (admin room)
  useEffect(() => {
    let socket: Awaited<ReturnType<typeof getOrderSocket>> | null = null
    getOrderSocket()
      .then((s) => {
        socket = s
        s.on('order:update', () => load())
      })
      .catch(() => {})
    return () => {
      socket?.off('order:update')
    }
  }, [load])

  const updateStatus = async (order: AdminOrder, next: OrderStatus) => {
    try {
      await patch(`/api/admin/orders/${order.id}/status`, { status: next })
      toast.success(`${order.orderNumber} → ${STATUS_LABELS[next]}`)
      setDetail(null)
      load()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const advanceLabel = (o: AdminOrder): { next: OrderStatus; label: string } | null => {
    const nexts = ADMIN_TRANSITIONS[o.status]?.filter((n) => n !== 'CANCELLED') ?? []
    if (nexts.length === 0) return null
    return { next: nexts[0], label: `Mark as ${STATUS_LABELS[nexts[0]]}` }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">ORDERS</h1>
          <p className="text-xs text-neutral-500">Search, inspect and advance orders — updates stream live to customers.</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" aria-hidden />
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search order no / customer…"
              className="pl-9 h-10 w-56 rounded-xl bg-white/5 border-white/10 text-white text-sm"
              aria-label="Search orders"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
            <SelectTrigger className="w-36 h-10 rounded-xl bg-white/5 border-white/10 text-white text-sm" aria-label="Filter by status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1a1a] border-white/10 text-white">
              <SelectItem value="all">All statuses</SelectItem>
              {ORDER_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={load} aria-label="Refresh orders" className="rounded-xl border-white/10 text-neutral-400">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* table */}
      <div className="rounded-2xl bg-card border border-white/5 overflow-x-auto thin-scrollbar">
        <table className="w-full text-sm min-w-[760px]">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-neutral-500 border-b border-white/5">
              <th className="px-4 py-3 font-medium">Order</th>
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Items</th>
              <th className="px-4 py-3 font-medium">Payment</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Total</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading && orders.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-neutral-500">Loading orders…</td></tr>
            )}
            {orders.map((o) => (
              <tr key={o.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-3 font-semibold">{o.orderNumber}
                  <p className="text-[11px] text-neutral-600 font-normal">{new Date(o.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</p>
                </td>
                <td className="px-4 py-3">
                  <p>{o.contactName}</p>
                  <p className="text-[11px] text-neutral-600">{o.user.email}</p>
                </td>
                <td className="px-4 py-3 text-neutral-400">{o.items.length}</td>
                <td className="px-4 py-3">
                  <span className={`text-[11px] font-semibold ${o.paymentStatus === 'PAID' ? 'text-green-400' : o.paymentStatus === 'REFUNDED' ? 'text-amber-400' : 'text-neutral-400'}`}>
                    {o.paymentMethod === 'COD' ? 'COD' : 'Online'} · {o.paymentStatus.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${STATUS_BADGE[o.status]}`}>{STATUS_LABELS[o.status]}</span>
                </td>
                <td className="px-4 py-3 text-right font-bold">{formatINR(o.total)}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    {advanceLabel(o) && (
                      <Button size="sm" onClick={() => updateStatus(o, advanceLabel(o)!.next)} className="h-8 rounded-full bg-primary text-white text-xs px-3">
                        {advanceLabel(o)!.label.replace('Mark as ', '')} →
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => setDetail(o)} className="h-8 rounded-full border-white/15 text-neutral-300 text-xs px-3">
                      Details
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* pagination */}
      <div className="flex items-center justify-between text-sm text-neutral-500">
        <span>Page {page} of {totalPages}</span>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-full border-white/10 text-neutral-400" aria-label="Previous page">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-full border-white/10 text-neutral-400" aria-label="Next page">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* detail dialog */}
      <Dialog open={!!detail} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent className="bg-[#151515] border-white/10 max-w-lg max-h-[85vh] overflow-y-auto thin-scrollbar">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-xl flex items-center justify-between">
                  {detail.orderNumber}
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_BADGE[detail.status]}`}>{STATUS_LABELS[detail.status]}</span>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-3 text-xs text-neutral-400">
                  <p><span className="text-neutral-600">Customer:</span> {detail.contactName} ({detail.user.email})</p>
                  <p><span className="text-neutral-600">Phone:</span> {detail.contactPhone}</p>
                  <p className="col-span-2"><span className="text-neutral-600">Address:</span> {(() => { try { const a = JSON.parse(detail.address); return `${a.fullText}, ${a.city} — ${a.pincode}` } catch { return detail.address } })()}</p>
                  {detail.instructions && <p className="col-span-2"><span className="text-neutral-600">Instructions:</span> {detail.instructions}</p>}
                  {detail.cancelReason && <p className="col-span-2 text-red-400"><span className="text-neutral-600">Cancel reason:</span> {detail.cancelReason}</p>}
                </div>

                <ul className="divide-y divide-white/5 rounded-xl border border-white/5">
                  {detail.items.map((i) => (
                    <li key={i.id} className="flex items-center justify-between gap-2 px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="font-medium">{i.quantity} × {i.name}</p>
                        {(() => { try { const opts = JSON.parse(i.options || '[]') as { label: string }[]; return opts.length ? <p className="text-[11px] text-neutral-500">{opts.map((o) => o.label).join(' · ')}</p> : null } catch { return null } })()}
                      </div>
                      <p className="font-semibold shrink-0">{formatINR(i.lineTotal)}</p>
                    </li>
                  ))}
                </ul>

                <div className="rounded-xl bg-white/5 p-3 space-y-1 text-xs">
                  <div className="flex justify-between"><span className="text-neutral-500">Subtotal</span><span>{formatINR(detail.subtotal)}</span></div>
                  {detail.discount > 0 && <div className="flex justify-between text-green-400"><span>Coupon {detail.couponCode}</span><span>−{formatINR(detail.discount)}</span></div>}
                  <div className="flex justify-between"><span className="text-neutral-500">Delivery</span><span>{detail.deliveryFee === 0 ? 'FREE' : formatINR(detail.deliveryFee)}</span></div>
                  <div className="flex justify-between"><span className="text-neutral-500">Tax</span><span>{formatINR(detail.tax)}</span></div>
                  <div className="flex justify-between font-bold text-sm pt-1"><span>Total</span><span>{formatINR(detail.total)}</span></div>
                </div>

                {/* status actions */}
                <div>
                  <p className="text-xs uppercase tracking-widest text-neutral-600 mb-2">Move to</p>
                  <div className="flex flex-wrap gap-2">
                    {(ADMIN_TRANSITIONS[detail.status] ?? []).map((n) => (
                      <Button
                        key={n}
                        size="sm"
                        variant={n === 'CANCELLED' ? 'outline' : 'default'}
                        onClick={() => updateStatus(detail, n)}
                        className={`h-9 rounded-full text-xs ${n === 'CANCELLED' ? 'border-red-500/40 text-red-400' : 'bg-primary text-white'}`}
                      >
                        {STATUS_LABELS[n]}
                      </Button>
                    ))}
                    {(ADMIN_TRANSITIONS[detail.status] ?? []).length === 0 && (
                      <p className="text-xs text-neutral-600 py-2">This order is final — no further transitions.</p>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

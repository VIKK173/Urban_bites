'use client'

import { useEffect, useState } from 'react'
import { Minus, Plus, Trash2, ShoppingBag, Tag, ArrowRight, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { VegBadge } from '@/components/urb/FoodCard'
import { useCartStore } from '@/store/cart-store'
import { useAuthStore } from '@/store/auth-store'
import { navigate } from '@/hooks/useHashRoute'
import { formatINR } from '@/lib/money'
import { toast } from 'sonner'

export default function CartPage() {
  const { items, totals, coupon, loading, loadedOnce, fetchCart, setQuantity, removeItem } = useCartStore()
  const user = useAuthStore((s) => s.user)

  useEffect(() => {
    if (user && !loadedOnce) fetchCart()
  }, [user, loadedOnce, fetchCart])

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-28 text-center">
        <ShoppingBag className="mx-auto w-10 h-10 text-neutral-600" />
        <h1 className="font-display mt-4 text-2xl font-bold">Your cart is waiting</h1>
        <p className="mt-2 text-sm text-neutral-500">Log in to see your saved cart and check out in seconds.</p>
        <Button onClick={() => navigate('/login')} className="mt-6 rounded-full bg-primary text-white px-8">Log In</Button>
      </div>
    )
  }

  if (loading && items.length === 0) {
    return (
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-12 grid lg:grid-cols-[1fr_360px] gap-8">
        <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl bg-white/5" />)}</div>
        <Skeleton className="h-72 rounded-2xl bg-white/5" />
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-md px-4 py-28 text-center">
        <span className="mx-auto grid place-items-center w-16 h-16 rounded-2xl bg-white/5">
          <ShoppingBag className="w-7 h-7 text-neutral-500" />
        </span>
        <h1 className="font-display mt-5 text-2xl font-bold">Your cart is empty</h1>
        <p className="mt-2 text-sm text-neutral-500">The kitchen is fired up. Go pick something bold.</p>
        <Button onClick={() => navigate('/menu')} className="mt-6 rounded-full bg-primary text-white px-8 h-11">Browse the menu</Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10 sm:py-14">
      <h1 className="font-display text-3xl sm:text-4xl font-bold">YOUR CART</h1>
      <p className="mt-1.5 text-sm text-neutral-500">{items.reduce((n, i) => n + i.quantity, 0)} items · reviewing before checkout</p>

      <div className="mt-8 grid lg:grid-cols-[1fr_380px] gap-8 items-start">
        {/* items */}
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id} className="rounded-2xl bg-card border border-white/5 p-4 flex gap-4">
              { }
              <img
                src={item.product.image || '/images/placeholder.png'}
                alt={item.product.name}
                className="w-20 h-20 rounded-xl object-cover bg-white/5 shrink-0"
                loading="lazy"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <VegBadge isVeg={item.product.isVeg} />
                      <h2 className="font-semibold text-[15px] truncate">{item.product.name}</h2>
                    </div>
                    {item.options.length > 0 && (
                      <p className="mt-1 text-xs text-neutral-500">{item.options.map((o) => o.label).join(' · ')}</p>
                    )}
                    {item.notes && <p className="text-xs text-neutral-600 mt-0.5 italic">“{item.notes}”</p>}
                    {!item.product.isAvailable && (
                      <p className="mt-1 text-xs text-red-400 font-medium">Just went unavailable — remove to continue</p>
                    )}
                  </div>
                  <button
                    onClick={async () => { await removeItem(item.id); toast.success('Removed from cart') }}
                    aria-label={`Remove ${item.product.name} from cart`}
                    className="text-neutral-600 hover:text-red-400 transition-colors p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center rounded-full border border-white/15" role="group" aria-label={`Quantity of ${item.product.name}`}>
                    <button
                      onClick={() => setQuantity(item.id, item.quantity - 1)}
                      aria-label="Decrease quantity"
                      className="w-9 h-9 grid place-items-center text-neutral-300 hover:text-white"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-7 text-center text-sm font-bold" aria-live="polite">{item.quantity}</span>
                    <button
                      onClick={() => setQuantity(item.id, Math.min(10, item.quantity + 1))}
                      aria-label="Increase quantity"
                      className="w-9 h-9 grid place-items-center text-neutral-300 hover:text-white"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="font-bold">{formatINR(item.lineTotal)}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>

        {/* bill */}
        <aside className="rounded-2xl bg-card border border-white/5 p-5 lg:sticky lg:top-24">
          <h2 className="font-display text-lg font-semibold">Bill Details</h2>
          <BillSummary totals={totals} couponCode={coupon?.code} />

          <Separator className="my-4 bg-white/5" />
          <CouponBox />

          <Separator className="my-4 bg-white/5" />
          <Button
            onClick={() => navigate('/checkout')}
            disabled={items.some((i) => !i.product.isAvailable)}
            className="w-full h-12 rounded-full bg-primary hover:bg-primary/90 font-bold"
          >
            Proceed to Checkout <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
          {items.some((i) => !i.product.isAvailable) && (
            <p className="mt-2 text-xs text-red-400 text-center">Remove unavailable items to continue.</p>
          )}
        </aside>
      </div>
    </div>
  )
}

export function BillSummary({
  totals,
  couponCode,
}: {
  totals: import('@/store/cart-store').CartTotals | null
  couponCode?: string
}) {
  if (!totals) return <Skeleton className="mt-4 h-28 bg-white/5" />
  return (
    <dl className="mt-4 space-y-2.5 text-sm">
      <div className="flex justify-between text-neutral-400">
        <dt>Subtotal</dt>
        <dd className="text-neutral-200">{formatINR(totals.subtotal)}</dd>
      </div>
      {totals.discount > 0 && (
        <div className="flex justify-between text-green-400">
          <dt>Coupon {couponCode}</dt>
          <dd>−{formatINR(totals.discount)}</dd>
        </div>
      )}
      {totals.couponMessage && totals.discount === 0 && (
        <p className="text-xs text-amber-400">{totals.couponMessage}</p>
      )}
      <div className="flex justify-between text-neutral-400">
        <dt>Delivery fee</dt>
        <dd className={totals.deliveryFee === 0 ? 'text-green-400 font-semibold' : 'text-neutral-200'}>
          {totals.deliveryFee === 0 ? 'FREE' : formatINR(totals.deliveryFee)}
        </dd>
      </div>
      <div className="flex justify-between text-neutral-400">
        <dt>GST & charges</dt>
        <dd className="text-neutral-200">{formatINR(totals.tax)}</dd>
      </div>
      <Separator className="my-3 bg-white/5" />
      <div className="flex justify-between text-base font-bold">
        <dt>To pay</dt>
        <dd>{formatINR(totals.total)}</dd>
      </div>
    </dl>
  )
}

function CouponBox() {
  const { fetchCart, coupon } = useCartStore()
  const [code, setCode] = useState('')
  const [applying, setApplying] = useState(false)

  const apply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim()) return
    setApplying(true)
    try {
      await fetchCart(code.trim().toUpperCase())
      const t = useCartStore.getState().totals
      if (t?.couponApplied) toast.success(`Coupon ${code.toUpperCase()} applied!`)
      else toast.error(t?.couponMessage || 'Coupon could not be applied')
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setApplying(false)
    }
  }

  if (coupon) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-green-500/30 bg-green-500/10 px-3.5 py-3">
        <p className="flex items-center gap-2 text-sm text-green-400 font-semibold">
          <Tag className="w-4 h-4" /> {coupon.code} applied
        </p>
        <button
          onClick={async () => { await fetchCart(); toast.info('Coupon removed') }}
          aria-label="Remove coupon"
          className="text-neutral-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={apply} className="flex gap-2">
      <label htmlFor="coupon-code" className="sr-only">Coupon code</label>
      <Input
        id="coupon-code"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="Coupon code"
        className="flex-1 h-11 bg-white/5 border-white/10 text-white uppercase placeholder:text-neutral-600 placeholder:normal-case"
      />
      <Button type="submit" variant="outline" disabled={applying} className="h-11 rounded-xl border-white/15 text-white">
        {applying ? '…' : 'Apply'}
      </Button>
    </form>
  )
}

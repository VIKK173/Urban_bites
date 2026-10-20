'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  MapPin, Phone, ClipboardList, CreditCard, Banknote, Check, ChevronLeft,
  Plus, ShieldCheck, Lock, Loader2, Tag, Wallet,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useCartStore } from '@/store/cart-store'
import { useAuthStore } from '@/store/auth-store'
import { BillSummary } from '@/components/urb/pages/CartPage'
import { get, post, patch } from '@/services/api'
import { navigate } from '@/hooks/useHashRoute'
import { formatINR } from '@/lib/money'
import { toast } from 'sonner'
import { cartCount } from '@/store/cart-store'

interface Address {
  id: string
  label: string
  fullText: string
  city: string
  state: string
  pincode: string
  phone: string
  isDefault: boolean
}

interface Settings {
  codEnabled: boolean
  deliveryFee: number
  freeDeliveryThreshold: number
  taxPercent: number
}

const STEPS = ['Address', 'Contact', 'Review', 'Payment'] as const

export default function CheckoutPage() {
  const { items, totals, coupon, fetchCart } = useCartStore()
  const { user, status } = useAuthStore()

  const [step, setStep] = useState(0)
  const [addresses, setAddresses] = useState<Address[]>([])
  const [selectedAddress, setSelectedAddress] = useState<string>('')
  const [showNewAddress, setShowNewAddress] = useState(false)
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [instructions, setInstructions] = useState('')
  const [saveAddress, setSaveAddress] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'RAZORPAY' | 'COD'>('RAZORPAY')
  const [settings, setSettings] = useState<Settings | null>(null)
  const [placing, setPlacing] = useState(false)
  const [simModal, setSimModal] = useState<{ gatewayOrderId: string; amount: number } | null>(null)

  // contact fields fall back to profile values until the user edits them
  const effectiveName = contactName || user?.name || ''
  const effectivePhone = contactPhone || user?.phone || ''
  // single normalized form used for validation AND submission
  const normalizedPhone = effectivePhone.replace(/\s+/g, '').replace(/^(\+91)?(?=[6-9])/, '')

  // auth gate
  useEffect(() => {
    if (status === 'guest') navigate('/login')
  }, [status])

  useEffect(() => {
    if (!user) return
    get<{ addresses: Address[] }>('/api/addresses')
      .then((d) => {
        setAddresses(d.addresses)
        const def = d.addresses.find((a) => a.isDefault) || d.addresses[0]
        if (def) setSelectedAddress(def.id)
        else setShowNewAddress(true)
      })
      .catch(() => setShowNewAddress(true))
    get<{ settings: Settings }>('/api/settings').then((d) => setSettings(d.settings)).catch(() => {})
  }, [user])

  useEffect(() => {
    if (user) fetchCart()
  }, [user, fetchCart])

  const canPlace = useMemo(() => {
    if (items.length === 0) return false
    if (items.some((i) => !i.product.isAvailable)) return false
    if (step === 0 && !selectedAddress) return false
    if (step === 1 && (!effectiveName.trim() || !/^[6-9]\d{9}$/.test(normalizedPhone))) return false
    return true
  }, [items, step, selectedAddress, effectiveName, normalizedPhone])

  if (status !== 'authed' || !user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24">
        <Skeleton className="h-96 rounded-3xl bg-white/5" />
      </div>
    )
  }

  if (items.length === 0 && !placing) {
    return (
      <div className="mx-auto max-w-md px-4 py-28 text-center">
        <h1 className="font-display text-2xl font-bold">Nothing to check out</h1>
        <p className="mt-2 text-sm text-neutral-500">Your cart is empty — add something delicious first.</p>
        <Button onClick={() => navigate('/menu')} className="mt-6 rounded-full bg-primary text-white px-8 h-11">Browse menu</Button>
      </div>
    )
  }

  /* ------------------------------------------------------------------ */
  const placeOrder = async (idempotencyKey: string) => {
    const addr = addresses.find((a) => a.id === selectedAddress)
    setPlacing(true)
    try {
      const { order } = await post<{ order: { id: string; orderNumber: string; paymentMethod: string; paymentStatus: string; total: number } }>('/api/orders', {
        idempotencyKey,
        addressId: selectedAddress || undefined,
        address: !selectedAddress
          ? {
              label: 'Home',
              fullText: (document.getElementById('new-fulltext') as HTMLInputElement)?.value || '',
              city: (document.getElementById('new-city') as HTMLInputElement)?.value || '',
              state: 'Maharashtra',
              pincode: (document.getElementById('new-pincode') as HTMLInputElement)?.value || '',
              phone: normalizedPhone,
            }
          : undefined,
        contactName: effectiveName,
        contactPhone: normalizedPhone,
        instructions,
        paymentMethod,
        couponCode: coupon?.code || '',
        saveAddress,
      })

      if (order.paymentMethod === 'COD') {
        toast.success(`Order ${order.orderNumber} placed — pay cash on delivery`)
        await fetchCart()
        navigate(`/order/${order.orderNumber}`)
        return
      }

      // online payment
      const gw = await post<{ gatewayOrderId: string; amount: number; mode: string; keyId: string }>('/api/payments/razorpay/order', { orderId: order.id })

      if (gw.mode === 'razorpay-test') {
        await openRazorpayCheckout(gw, order, idempotencyKey)
      } else {
        // dev simulation gateway
        setSimModal({ gatewayOrderId: gw.gatewayOrderId, amount: gw.amount })
        setPlacing(false)
      }
    } catch (e) {
      toast.error((e as Error).message || 'Could not place your order')
      setPlacing(false)
    }
  }

  const openRazorpayCheckout = async (
    gw: { gatewayOrderId: string; amount: number; keyId: string },
    order: { orderNumber: string },
    _key: string,
  ) => {
    try {
      await loadRazorpayScript()
      if (!window.Razorpay) throw new Error('Razorpay failed to load')
      const rzp = new window.Razorpay({
        key: gw.keyId,
        amount: gw.amount,
        currency: 'INR',
        name: 'Urban Bites',
        description: `Order ${order.orderNumber}`,
        order_id: gw.gatewayOrderId,
        theme: { color: '#ff354d' },
        prefill: { name: effectiveName, contact: normalizedPhone },
        handler: async (resp: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          try {
            await post('/api/payments/razorpay/verify', resp)
            toast.success('Payment verified — order confirmed!')
            await fetchCart()
            navigate(`/order/${order.orderNumber}`)
          } catch (e) {
            toast.error((e as Error).message)
            navigate(`/order/${order.orderNumber}`)
          }
        },
        modal: {
          ondismiss: () => {
            toast.info('Payment window closed — your order is saved as pending')
            navigate(`/order/${order.orderNumber}`)
          },
        },
      })
      rzp.on('payment.failed', () => toast.error('Payment failed at the gateway. No money was captured twice — you can retry.'))
      rzp.open()
    } catch (e) {
      toast.error((e as Error).message || 'Could not open Razorpay checkout')
      setPlacing(false)
    }
  }

  const completeSimulatedPayment = async (outcome: 'success' | 'failure') => {
    if (!simModal) return
    setPlacing(true)
    try {
      if (outcome === 'failure') {
        await post('/api/payments/razorpay/simulate', { gatewayOrderId: simModal.gatewayOrderId, outcome })
        toast.error('Simulated payment failed — you can retry from the order page.')
        setSimModal(null)
        setPlacing(false)
        return
      }
      const sim = await post<{ razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }>('/api/payments/razorpay/simulate', {
        gatewayOrderId: simModal.gatewayOrderId,
        outcome,
      })
      await post('/api/payments/razorpay/verify', {
        razorpay_order_id: sim.razorpay_order_id,
        razorpay_payment_id: sim.razorpay_payment_id,
        razorpay_signature: sim.razorpay_signature,
      })
      toast.success('Payment verified — order confirmed!')
      setSimModal(null)
      await fetchCart()
      navigate('/orders')
    } catch (e) {
      toast.error((e as Error).message)
      setPlacing(false)
    }
  }

  /* ------------------------------------------------------------------ */

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10 sm:py-14">
      {/* stepper */}
      <ol className="flex items-center gap-2 sm:gap-3" aria-label="Checkout progress">
        {STEPS.map((s, i) => (
          <li key={s} className="flex items-center gap-2 sm:gap-3 flex-1 last:flex-none">
            <button
              onClick={() => i < step && setStep(i)}
              disabled={i > step}
              aria-current={i === step ? 'step' : undefined}
              className="flex items-center gap-2 disabled:cursor-default"
            >
              <span
                className={`grid place-items-center w-8 h-8 rounded-full text-xs font-bold transition-colors ${
                  i < step ? 'bg-green-500 text-white' : i === step ? 'bg-primary text-white' : 'bg-white/5 text-neutral-500'
                }`}
              >
                {i < step ? <Check className="w-4 h-4" /> : i + 1}
              </span>
              <span className={`text-xs sm:text-sm font-medium hidden sm:block ${i === step ? 'text-white' : 'text-neutral-500'}`}>{s}</span>
            </button>
            {i < STEPS.length - 1 && <span className={`flex-1 h-px ${i < step ? 'bg-green-500/60' : 'bg-white/10'}`} aria-hidden />}
          </li>
        ))}
      </ol>

      <div className="mt-8 grid lg:grid-cols-[1fr_340px] gap-8 items-start">
        <section>
          {/* STEP 1 — address */}
          {step === 0 && (
            <div className="space-y-4">
              <h1 className="font-display text-2xl font-bold">Where should we deliver?</h1>
              {addresses.map((a) => (
                <label
                  key={a.id}
                  className={`flex items-start gap-3 rounded-2xl border p-4 cursor-pointer transition-all ${
                    selectedAddress === a.id ? 'border-primary bg-primary/5' : 'border-white/10 hover:border-white/25'
                  }`}
                >
                  <input
                    type="radio"
                    name="address"
                    value={a.id}
                    checked={selectedAddress === a.id}
                    onChange={() => setSelectedAddress(a.id)}
                    className="mt-1 accent-[#ff354d]"
                  />
                  <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" aria-hidden />
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      {a.label} {a.isDefault && <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-neutral-300">Default</span>}
                    </span>
                    <span className="block text-sm text-neutral-400 mt-1">{a.fullText}, {a.city}, {a.state} — {a.pincode}</span>
                  </span>
                </label>
              ))}

              {showNewAddress ? (
                <div className="rounded-2xl border border-white/10 p-4 space-y-3">
                  <h2 className="text-sm font-semibold flex items-center gap-2"><Plus className="w-4 h-4 text-primary" /> New address</h2>
                  <AddressFields />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={async () => {
                        const fullText = (document.getElementById('new-fulltext') as HTMLInputElement)?.value || ''
                        const city = (document.getElementById('new-city') as HTMLInputElement)?.value || ''
                        const state = 'Maharashtra'
                        const pincode = (document.getElementById('new-pincode') as HTMLInputElement)?.value || ''
                        const phone = (document.getElementById('new-phone') as HTMLInputElement)?.value || ''
                        try {
                          const { address } = await post<{ address: Address }>('/api/addresses', {
                            label: 'Home', fullText, city, state, pincode, phone, isDefault: addresses.length === 0,
                          })
                          setAddresses((prev) => [address, ...prev])
                          setSelectedAddress(address.id)
                          setShowNewAddress(false)
                          toast.success('Address saved')
                        } catch (e) {
                          toast.error((e as Error).message)
                        }
                      }}
                      className="rounded-full bg-primary text-white"
                    >
                      Save address
                    </Button>
                    {addresses.length > 0 && (
                      <Button type="button" variant="ghost" onClick={() => setShowNewAddress(false)} className="rounded-full text-neutral-400">
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowNewAddress(true)} className="flex items-center gap-2 text-sm font-semibold text-primary hover:gap-3 transition-all">
                  <Plus className="w-4 h-4" /> Add a new address
                </button>
              )}
            </div>
          )}

          {/* STEP 2 — contact */}
          {step === 1 && (
            <div className="space-y-5">
              <h1 className="font-display text-2xl font-bold">Contact & instructions</h1>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="co-name" className="text-neutral-300">Contact name</Label>
                  <Input id="co-name" value={effectiveName} onChange={(e) => setContactName(e.target.value)} className="mt-1.5 h-11 bg-white/5 border-white/10 text-white" />
                </div>
                <div>
                  <Label htmlFor="co-phone" className="text-neutral-300">Mobile number</Label>
                  <Input id="co-phone" value={effectivePhone} onChange={(e) => setContactPhone(e.target.value)} inputMode="tel" className="mt-1.5 h-11 bg-white/5 border-white/10 text-white" placeholder="10-digit mobile" />
                </div>
              </div>
              <div>
                <Label htmlFor="co-instructions" className="text-neutral-300">Delivery instructions (optional)</Label>
                <Textarea id="co-instructions" value={instructions} onChange={(e) => setInstructions(e.target.value)} maxLength={300} placeholder="Ring the bell twice, leave at reception…" className="mt-1.5 bg-white/5 border-white/10 text-white min-h-20" />
              </div>
              <label className="flex items-center gap-2.5 text-sm text-neutral-300 cursor-pointer">
                <Checkbox checked={saveAddress} onCheckedChange={(v) => setSaveAddress(!!v)} />
                Save new address to my profile (if you added one)
              </label>
            </div>
          )}

          {/* STEP 3 — review */}
          {step === 2 && (
            <div className="space-y-4">
              <h1 className="font-display text-2xl font-bold">Review your order</h1>
              <ul className="rounded-2xl bg-card border border-white/5 divide-y divide-white/5">
                {items.map((i) => (
                  <li key={i.id} className="flex items-center gap-3 p-4">
                    { }
                    <img src={i.product.image || '/images/placeholder.png'} alt="" className="w-14 h-14 rounded-xl object-cover bg-white/5" loading="lazy" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{i.quantity} × {i.product.name}</p>
                      {i.options.length > 0 && <p className="text-xs text-neutral-500">{i.options.map((o) => o.label).join(' · ')}</p>}
                    </div>
                    <p className="text-sm font-bold">{formatINR(i.lineTotal)}</p>
                  </li>
                ))}
              </ul>
              <div className="rounded-2xl bg-card border border-white/5 p-4 text-sm text-neutral-300 space-y-1.5">
                <p className="flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> {addresses.find((a) => a.id === selectedAddress)?.fullText || '—'}</p>
                <p className="flex items-center gap-2"><Phone className="w-4 h-4 text-primary" /> {effectiveName} · {effectivePhone}</p>
                {instructions && <p className="flex items-center gap-2"><ClipboardList className="w-4 h-4 text-primary" /> {instructions}</p>}
              </div>
            </div>
          )}

          {/* STEP 4 — payment */}
          {step === 3 && (
            <div className="space-y-4">
              <h1 className="font-display text-2xl font-bold">Payment method</h1>
              {settings?.codEnabled && (
                <label className={`flex items-center gap-3 rounded-2xl border p-4 cursor-pointer transition-all ${paymentMethod === 'COD' ? 'border-primary bg-primary/5' : 'border-white/10 hover:border-white/25'}`}>
                  <input type="radio" name="pay" checked={paymentMethod === 'COD'} onChange={() => setPaymentMethod('COD')} className="accent-[#ff354d]" />
                  <Banknote className="w-5 h-5 text-primary" aria-hidden />
                  <span>
                    <span className="block text-sm font-semibold">Cash on Delivery</span>
                    <span className="block text-xs text-neutral-500 mt-0.5">Pay our rider in cash or UPI when your food arrives</span>
                  </span>
                </label>
              )}
              <label className={`flex items-center gap-3 rounded-2xl border p-4 cursor-pointer transition-all ${paymentMethod === 'RAZORPAY' ? 'border-primary bg-primary/5' : 'border-white/10 hover:border-white/25'}`}>
                <input type="radio" name="pay" checked={paymentMethod === 'RAZORPAY'} onChange={() => setPaymentMethod('RAZORPAY')} className="accent-[#ff354d]" />
                <CreditCard className="w-5 h-5 text-primary" aria-hidden />
                <span>
                  <span className="block text-sm font-semibold">Pay Online — UPI, Cards, Wallets</span>
                  <span className="block text-xs text-neutral-500 mt-0.5">Secured by Razorpay · verified server-side before the kitchen starts</span>
                </span>
              </label>
              <p className="flex items-start gap-2 text-xs text-neutral-500">
                <ShieldCheck className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                Every online payment is signature-verified on our servers. We never trust the browser to tell us a payment succeeded.
              </p>
            </div>
          )}

          {/* nav buttons */}
          <div className="mt-8 flex items-center justify-between">
            <Button variant="ghost" onClick={() => (step === 0 ? navigate('/cart') : setStep((s) => s - 1))} className="rounded-full text-neutral-400 hover:text-white">
              <ChevronLeft className="w-4 h-4" /> {step === 0 ? 'Back to cart' : STEPS[step - 1]}
            </Button>
            {step < 3 ? (
              <Button
                onClick={() => setStep((s) => Math.min(3, s + 1))}
                disabled={!canPlace}
                className="rounded-full bg-primary hover:bg-primary/90 font-bold px-8 h-12"
              >
                Continue
              </Button>
            ) : (
              <Button
                onClick={() => placeOrder(crypto.randomUUID())}
                disabled={!canPlace || placing}
                className="rounded-full bg-primary hover:bg-primary/90 font-bold px-8 h-12 glow-red"
              >
                {placing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing…
                  </>
                ) : paymentMethod === 'COD' ? (
                  <>Place Order · {formatINR(totals?.total ?? 0)}</>
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-2" /> Pay {formatINR(totals?.total ?? 0)}
                  </>
                )}
              </Button>
            )}
          </div>
        </section>

        {/* bill sidebar */}
        <aside className="rounded-2xl bg-card border border-white/5 p-5 lg:sticky lg:top-24">
          <h2 className="font-display text-lg font-semibold">Bill Details</h2>
          <p className="text-xs text-neutral-500 mt-0.5">{cartCount(items)} items · incl. taxes</p>
          <BillSummary totals={totals} couponCode={coupon?.code} />
          {coupon && (
            <p className="mt-3 flex items-center gap-1.5 text-xs text-green-400">
              <Tag className="w-3.5 h-3.5" /> {coupon.code}: {coupon.description}
            </p>
          )}
        </aside>
      </div>

      {/* simulated gateway modal (dev fallback) */}
      <Dialog open={!!simModal} onOpenChange={(v) => !v && setSimModal(null)}>
        <DialogContent className="bg-[#151515] border-white/10 max-w-sm" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display text-xl">
              <Wallet className="w-5 h-5 text-primary" /> Razorpay Simulator
            </DialogTitle>
          </DialogHeader>
          {simModal && (
            <div className="space-y-4">
              <p className="text-xs rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 p-3 leading-relaxed">
                Development mode: no Razorpay keys configured, so this simulated gateway stands in for the hosted checkout.
                Add <code className="text-amber-200">RAZORPAY_KEY_ID</code> / <code className="text-amber-200">RAZORPAY_KEY_SECRET</code> to .env for real test payments.
              </p>
              <div className="rounded-xl bg-white/5 p-4">
                <p className="text-xs text-neutral-500">Amount to pay</p>
                <p className="text-2xl font-bold">{formatINR(simModal.amount)}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Button onClick={() => completeSimulatedPayment('success')} disabled={placing} className="rounded-full bg-green-600 hover:bg-green-600/90 font-semibold">
                  Pay (success)
                </Button>
                <Button onClick={() => completeSimulatedPayment('failure')} disabled={placing} variant="outline" className="rounded-full border-red-500/40 text-red-400">
                  Simulate failure
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function AddressFields() {
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      <div className="sm:col-span-2">
        <Label htmlFor="new-fulltext" className="text-neutral-300">Full address</Label>
        <Input id="new-fulltext" className="mt-1.5 h-11 bg-white/5 border-white/10 text-white" placeholder="Flat, building, street…" />
      </div>
      <div>
        <Label htmlFor="new-city" className="text-neutral-300">City</Label>
        <Input id="new-city" defaultValue="Mumbai" className="mt-1.5 h-11 bg-white/5 border-white/10 text-white" />
      </div>
      <div>
        <Label htmlFor="new-pincode" className="text-neutral-300">Pincode</Label>
        <Input id="new-pincode" inputMode="numeric" maxLength={6} className="mt-1.5 h-11 bg-white/5 border-white/10 text-white" placeholder="400050" />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="new-phone" className="text-neutral-300">Contact phone</Label>
        <Input id="new-phone" inputMode="tel" className="mt-1.5 h-11 bg-white/5 border-white/10 text-white" placeholder="10-digit mobile" />
      </div>
    </div>
  )
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      on: (event: string, callback: () => void) => void
      open: () => void
    }
  }
}

function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('No window'))
    if ((window as unknown as { Razorpay?: unknown }).Razorpay) return resolve()
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Could not load Razorpay. Check your connection and retry.'))
    document.body.appendChild(script)
  })
}

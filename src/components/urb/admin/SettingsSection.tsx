'use client'

import { useEffect, useState } from 'react'
import { Loader2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { get, patch } from '@/services/api'
import { paiseToRupees, rupeesToPaise } from '@/lib/money'
import { toast } from 'sonner'

interface FullSettings {
  deliveryFee: number
  freeDeliveryThreshold: number
  taxPercent: number
  codEnabled: boolean
  etaMinutes: number
  offerTitle: string
  offerText: string
  offerCode: string
  offerDiscount: number
  offerActive: boolean
  address: string
  phone: string
  email: string
  openHours: string
  mapLat: number
  mapLng: number
}

export default function SettingsSection() {
  const [s, setS] = useState<FullSettings | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    get<{ settings: FullSettings }>('/api/admin/settings')
      .then((d) =>
        setS({
          ...d.settings,
          // work in rupees for money fields in the form
          ...({} as Record<string, never>),
        }),
      )
      .catch((e) => toast.error(e.message))
  }, [])

  if (!s) return <p className="text-sm text-neutral-500 py-12 text-center">Loading settings…</p>

  const set = <K extends keyof FullSettings>(key: K, value: FullSettings[K]) => setS((prev) => (prev ? { ...prev, [key]: value } : prev))

  const save = async () => {
    setSaving(true)
    try {
      await patch('/api/admin/settings', s)
      toast.success('Settings saved — live for all customers')
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="font-display text-2xl font-bold">RESTAURANT SETTINGS</h1>
        <p className="text-xs text-neutral-500">Delivery fee, taxes, COD toggle, offer banner and contact info.</p>
      </div>

      <section className="rounded-2xl bg-card border border-white/5 p-5 space-y-4">
        <h2 className="font-display text-base font-semibold">Pricing & fees</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-neutral-300">Delivery fee (₹)</Label>
            <Input
              type="number" min="0" step="0.5"
              value={paiseToRupees(s.deliveryFee)}
              onChange={(e) => set('deliveryFee', rupeesToPaise(Number(e.target.value)))}
              className="mt-1.5 h-10 bg-white/5 border-white/10 text-white"
            />
          </div>
          <div>
            <Label className="text-neutral-300">Free delivery above (₹)</Label>
            <Input
              type="number" min="0" step="1"
              value={paiseToRupees(s.freeDeliveryThreshold)}
              onChange={(e) => set('freeDeliveryThreshold', rupeesToPaise(Number(e.target.value)))}
              className="mt-1.5 h-10 bg-white/5 border-white/10 text-white"
            />
          </div>
          <div>
            <Label className="text-neutral-300">Tax (GST %)</Label>
            <Input type="number" min="0" max="40" step="0.5" value={s.taxPercent} onChange={(e) => set('taxPercent', Number(e.target.value))} className="mt-1.5 h-10 bg-white/5 border-white/10 text-white" />
          </div>
          <div>
            <Label className="text-neutral-300">Estimated delivery (min)</Label>
            <Input type="number" min="10" max="180" value={s.etaMinutes} onChange={(e) => set('etaMinutes', Number(e.target.value))} className="mt-1.5 h-10 bg-white/5 border-white/10 text-white" />
          </div>
        </div>
        <label className="flex items-center justify-between rounded-xl border border-white/10 p-3.5">
          <span>
            <span className="block text-sm font-medium">Cash on Delivery</span>
            <span className="block text-xs text-neutral-500 mt-0.5">When off, checkout shows online payment only</span>
          </span>
          <Switch checked={s.codEnabled} onCheckedChange={(v) => set('codEnabled', v)} aria-label="Toggle cash on delivery" />
        </label>
      </section>

      <section className="rounded-2xl bg-card border border-white/5 p-5 space-y-4">
        <h2 className="font-display text-base font-semibold">Homepage offer banner</h2>
        <label className="flex items-center justify-between rounded-xl border border-white/10 p-3.5">
          <span className="text-sm font-medium">Show offer banner</span>
          <Switch checked={s.offerActive} onCheckedChange={(v) => set('offerActive', v)} aria-label="Toggle offer banner" />
        </label>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-neutral-300">Title</Label>
            <Input value={s.offerTitle} onChange={(e) => set('offerTitle', e.target.value)} className="mt-1.5 h-10 bg-white/5 border-white/10 text-white" />
          </div>
          <div>
            <Label className="text-neutral-300">Coupon code</Label>
            <Input value={s.offerCode} onChange={(e) => set('offerCode', e.target.value.toUpperCase())} className="mt-1.5 h-10 bg-white/5 border-white/10 text-white uppercase" />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-neutral-300">Text</Label>
            <Input value={s.offerText} onChange={(e) => set('offerText', e.target.value)} className="mt-1.5 h-10 bg-white/5 border-white/10 text-white" />
          </div>
          <div>
            <Label className="text-neutral-300">Discount % (display)</Label>
            <Input type="number" min="0" max="100" value={s.offerDiscount} onChange={(e) => set('offerDiscount', Number(e.target.value))} className="mt-1.5 h-10 bg-white/5 border-white/10 text-white" />
          </div>
        </div>
      </section>

      <section className="rounded-2xl bg-card border border-white/5 p-5 space-y-4">
        <h2 className="font-display text-base font-semibold">Contact & location</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-neutral-300">Phone</Label>
            <Input value={s.phone} onChange={(e) => set('phone', e.target.value)} className="mt-1.5 h-10 bg-white/5 border-white/10 text-white" />
          </div>
          <div>
            <Label className="text-neutral-300">Email</Label>
            <Input value={s.email} onChange={(e) => set('email', e.target.value)} className="mt-1.5 h-10 bg-white/5 border-white/10 text-white" />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-neutral-300">Address</Label>
            <Input value={s.address} onChange={(e) => set('address', e.target.value)} className="mt-1.5 h-10 bg-white/5 border-white/10 text-white" />
          </div>
          <div>
            <Label className="text-neutral-300">Open hours</Label>
            <Input value={s.openHours} onChange={(e) => set('openHours', e.target.value)} className="mt-1.5 h-10 bg-white/5 border-white/10 text-white" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-neutral-300">Map lat</Label>
              <Input type="number" step="0.0001" value={s.mapLat} onChange={(e) => set('mapLat', Number(e.target.value))} className="mt-1.5 h-10 bg-white/5 border-white/10 text-white" />
            </div>
            <div>
              <Label className="text-neutral-300">Map lng</Label>
              <Input type="number" step="0.0001" value={s.mapLng} onChange={(e) => set('mapLng', Number(e.target.value))} className="mt-1.5 h-10 bg-white/5 border-white/10 text-white" />
            </div>
          </div>
        </div>
      </section>

      <Button onClick={save} disabled={saving} className="rounded-full bg-primary text-white px-8 h-12 font-bold">
        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
        Save all settings
      </Button>
    </div>
  )
}

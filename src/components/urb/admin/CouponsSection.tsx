'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { get, post, patch, del } from '@/services/api'
import { formatINR, rupeesToPaise, paiseToRupees } from '@/lib/money'
import { toast } from 'sonner'

interface Coupon {
  id: string
  code: string
  description: string | null
  type: 'PERCENT' | 'FLAT'
  value: number
  minOrderValue: number
  maxDiscount: number | null
  isActive: boolean
  usageLimit: number | null
  usedCount: number
  validUntil: string | null
  createdAt: string
}

export default function CouponsSection() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    code: '', description: '', type: 'FLAT' as 'FLAT' | 'PERCENT',
    value: '', minOrder: '', maxDiscount: '', usageLimit: '',
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await get<{ coupons: Coupon[] }>('/api/admin/coupons')
      setCoupons(d.coupons)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const create = async () => {
    if (!form.code || !form.value) {
      toast.error('Code and value are required')
      return
    }
    setSaving(true)
    try {
      await post('/api/admin/coupons', {
        code: form.code,
        description: form.description,
        type: form.type,
        value: form.type === 'PERCENT' ? Number(form.value) : rupeesToPaise(Number(form.value)),
        minOrderValue: form.minOrder ? rupeesToPaise(Number(form.minOrder)) : 0,
        maxDiscount: form.maxDiscount ? rupeesToPaise(Number(form.maxDiscount)) : null,
        usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
        isActive: true,
      })
      toast.success('Coupon created')
      setOpen(false)
      setForm({ code: '', description: '', type: 'FLAT', value: '', minOrder: '', maxDiscount: '', usageLimit: '' })
      load()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (c: Coupon) => {
    try {
      await patch(`/api/admin/coupons/${c.id}`, { isActive: !c.isActive })
      load()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const remove = async (c: Coupon) => {
    if (!confirm(`Delete coupon ${c.code}?`)) return
    try {
      await del(`/api/admin/coupons/${c.id}`)
      toast.success('Coupon deleted')
      load()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold">COUPONS</h1>
          <p className="text-xs text-neutral-500">Discount codes are validated server-side at checkout.</p>
        </div>
        <Button onClick={() => setOpen(true)} className="rounded-full bg-primary text-white">
          <Plus className="w-4 h-4 mr-1" /> New coupon
        </Button>
      </div>

      <div className="rounded-2xl bg-card border border-white/5 overflow-x-auto thin-scrollbar">
        <table className="w-full text-sm min-w-[680px]">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-neutral-500 border-b border-white/5">
              <th className="px-4 py-3 font-medium">Code</th>
              <th className="px-4 py-3 font-medium">Discount</th>
              <th className="px-4 py-3 font-medium">Min order</th>
              <th className="px-4 py-3 font-medium">Used</th>
              <th className="px-4 py-3 font-medium">Active</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading && <tr><td colSpan={6} className="px-4 py-10 text-center text-neutral-500">Loading…</td></tr>}
            {coupons.map((c) => (
              <tr key={c.id} className="hover:bg-white/[0.02]">
                <td className="px-4 py-3">
                  <p className="font-display font-bold tracking-wider text-primary">{c.code}</p>
                  <p className="text-[11px] text-neutral-600">{c.description}</p>
                </td>
                <td className="px-4 py-3">
                  {c.type === 'PERCENT' ? `${c.value}%${c.maxDiscount ? ` (max ${formatINR(c.maxDiscount)})` : ''}` : formatINR(c.value)}
                </td>
                <td className="px-4 py-3 text-neutral-400">{c.minOrderValue > 0 ? formatINR(c.minOrderValue) : 'Any'}</td>
                <td className="px-4 py-3 text-neutral-400">
                  {c.usedCount}{c.usageLimit ? ` / ${c.usageLimit}` : ''}
                </td>
                <td className="px-4 py-3">
                  <Switch checked={c.isActive} onCheckedChange={() => toggleActive(c)} aria-label={`Toggle ${c.code}`} />
                </td>
                <td className="px-4 py-3 text-right">
                  <Button size="icon" variant="ghost" onClick={() => remove(c)} aria-label={`Delete ${c.code}`} className="text-neutral-600 hover:text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-[#151515] border-white/10 max-w-md">
          <DialogHeader><DialogTitle className="font-display text-xl">New coupon</DialogTitle></DialogHeader>
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-neutral-300">Code</Label>
                <Input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} className="mt-1.5 h-10 bg-white/5 border-white/10 text-white uppercase font-mono" placeholder="FLAT100" />
              </div>
              <div>
                <Label className="text-neutral-300">Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as 'FLAT' | 'PERCENT' }))}>
                  <SelectTrigger className="mt-1.5 h-10 bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border-white/10 text-white">
                    <SelectItem value="FLAT">Flat ₹</SelectItem>
                    <SelectItem value="PERCENT">Percent %</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-neutral-300">{form.type === 'PERCENT' ? 'Percent off (1-100)' : 'Amount off (₹)'}</Label>
              <Input type="number" min="1" value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))} className="mt-1.5 h-10 bg-white/5 border-white/10 text-white" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-neutral-300">Min order (₹)</Label>
                <Input type="number" min="0" value={form.minOrder} onChange={(e) => setForm((f) => ({ ...f, minOrder: e.target.value }))} className="mt-1.5 h-10 bg-white/5 border-white/10 text-white" placeholder="299" />
              </div>
              {form.type === 'PERCENT' && (
                <div>
                  <Label className="text-neutral-300">Max discount (₹)</Label>
                  <Input type="number" min="1" value={form.maxDiscount} onChange={(e) => setForm((f) => ({ ...f, maxDiscount: e.target.value }))} className="mt-1.5 h-10 bg-white/5 border-white/10 text-white" placeholder="150" />
                </div>
              )}
            </div>
            <div>
              <Label className="text-neutral-300">Usage limit (blank = unlimited)</Label>
              <Input type="number" min="1" value={form.usageLimit} onChange={(e) => setForm((f) => ({ ...f, usageLimit: e.target.value }))} className="mt-1.5 h-10 bg-white/5 border-white/10 text-white" />
            </div>
            <div>
              <Label className="text-neutral-300">Description</Label>
              <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="mt-1.5 h-10 bg-white/5 border-white/10 text-white" placeholder="Flat ₹100 off on orders above ₹499" />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" onClick={() => setOpen(false)} className="rounded-full text-neutral-400">Cancel</Button>
              <Button onClick={create} disabled={saving} className="rounded-full bg-primary text-white px-6">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create coupon'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

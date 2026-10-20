'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Eye, EyeOff, Star, Upload, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { get, post, patch, del } from '@/services/api'
import { formatINR, rupeesToPaise, paiseToRupees } from '@/lib/money'
import type { OptionGroup } from '@/lib/catalog'
import { toast } from 'sonner'

interface AdminProduct {
  id: string
  name: string
  slug: string
  description: string
  price: number
  comparePrice: number | null
  categoryId: string
  category?: { name: string; slug: string }
  image: string | null
  isVeg: boolean
  spiceLevel: number
  ingredients: string[]
  allergens: string[]
  options: OptionGroup[]
  rating: number
  ratingCount: number
  isAvailable: boolean
  isFeatured: boolean
  soldCount: number
}

interface Category {
  id: string
  name: string
  slug: string
}

const emptyForm = {
  name: '', description: '', priceRupees: '', compareRupees: '', categoryId: '', image: '',
  isVeg: true, spiceLevel: 0, ingredients: '', allergens: '', isAvailable: true, isFeatured: false,
}

export default function ProductsSection() {
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [dialog, setDialog] = useState<{ open: boolean; product: AdminProduct | null }>({ open: false, product: null })
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [p, c] = await Promise.all([
        get<{ products: AdminProduct[] }>('/api/products?limit=60&sort=newest'),
        get<{ categories: Category[] }>('/api/categories'),
      ])
      setProducts(p.products)
      setCategories(c.categories)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const openCreate = () => {
    setForm({ ...emptyForm, categoryId: categories[0]?.id || '' })
    setDialog({ open: true, product: null })
  }

  const openEdit = (p: AdminProduct) => {
    setForm({
      name: p.name,
      description: p.description,
      priceRupees: String(paiseToRupees(p.price)),
      compareRupees: p.comparePrice ? String(paiseToRupees(p.comparePrice)) : '',
      categoryId: p.categoryId,
      image: p.image || '',
      isVeg: p.isVeg,
      spiceLevel: p.spiceLevel,
      ingredients: p.ingredients.join(', '),
      allergens: p.allergens.join(', '),
      isAvailable: p.isAvailable,
      isFeatured: p.isFeatured,
    })
    setDialog({ open: true, product: p })
  }

  const handleUpload = async (file: File) => {
    setUploading(true)
    try {
      const dataBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve((reader.result as string).split(',')[1] || '')
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const res = await post<{ url: string; provider: string }>('/api/admin/upload', { fileName: file.name, mimeType: file.type, dataBase64 })
      setForm((f) => ({ ...f, image: res.url }))
      toast.success(`Image uploaded via ${res.provider}`)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setUploading(false)
    }
  }

  const save = async () => {
    if (!form.name || !form.description || !form.priceRupees || !form.categoryId) {
      toast.error('Name, description, price and category are required')
      return
    }
    setSaving(true)
    const payload = {
      name: form.name,
      description: form.description,
      price: rupeesToPaise(Number(form.priceRupees)),
      comparePrice: form.compareRupees ? rupeesToPaise(Number(form.compareRupees)) : null,
      categoryId: form.categoryId,
      image: form.image || null,
      isVeg: form.isVeg,
      spiceLevel: Number(form.spiceLevel),
      ingredients: form.ingredients.split(',').map((s) => s.trim()).filter(Boolean),
      allergens: form.allergens.split(',').map((s) => s.trim()).filter(Boolean),
      isAvailable: form.isAvailable,
      isFeatured: form.isFeatured,
    }
    try {
      if (dialog.product) {
        await patch(`/api/products/${dialog.product.id}`, payload)
        toast.success('Product updated')
      } else {
        await post('/api/products', payload)
        toast.success('Product created')
      }
      setDialog({ open: false, product: null })
      load()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const remove = async (p: AdminProduct) => {
    if (!confirm(`Delete "${p.name}"? Past orders keep their snapshots.`)) return
    try {
      await del(`/api/products/${p.id}`)
      toast.success('Product deleted')
      load()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const toggle = async (p: AdminProduct, field: 'isAvailable' | 'isFeatured') => {
    try {
      await patch(`/api/products/${p.id}`, { [field]: !p[field] })
      load()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold">PRODUCTS</h1>
          <p className="text-xs text-neutral-500">{products.length} items on the menu</p>
        </div>
        <Button onClick={openCreate} className="rounded-full bg-primary text-white">
          <Plus className="w-4 h-4 mr-1" /> New product
        </Button>
      </div>

      <div className="rounded-2xl bg-card border border-white/5 overflow-x-auto thin-scrollbar">
        <table className="w-full text-sm min-w-[720px]">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-neutral-500 border-b border-white/5">
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="px-4 py-3 font-medium">Rating</th>
              <th className="px-4 py-3 font-medium">Available</th>
              <th className="px-4 py-3 font-medium">Featured</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading && products.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-neutral-500">Loading…</td></tr>}
            {products.map((p) => (
              <tr key={p.id} className="hover:bg-white/[0.02]">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    { }
                    <img src={p.image || '/images/placeholder.png'} alt="" className="w-10 h-10 rounded-lg object-cover bg-white/5" loading="lazy" />
                    <div>
                      <p className="font-medium">{p.name}</p>
                      <p className="text-[11px] text-neutral-600">{p.isVeg ? 'Veg' : 'Non-veg'} · {p.soldCount} sold</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-neutral-400">{p.category?.name}</td>
                <td className="px-4 py-3">
                  <p className="font-semibold">{formatINR(p.price)}</p>
                  {p.comparePrice && <p className="text-[11px] text-neutral-600 line-through">{formatINR(p.comparePrice)}</p>}
                </td>
                <td className="px-4 py-3 text-neutral-400">
                  <span className="inline-flex items-center gap-1"><Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> {p.rating.toFixed(1)}</span>
                </td>
                <td className="px-4 py-3">
                  <Switch checked={p.isAvailable} onCheckedChange={() => toggle(p, 'isAvailable')} aria-label={`Toggle availability for ${p.name}`} />
                </td>
                <td className="px-4 py-3">
                  <Switch checked={p.isFeatured} onCheckedChange={() => toggle(p, 'isFeatured')} aria-label={`Toggle featured for ${p.name}`} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(p)} aria-label={`Edit ${p.name}`} className="text-neutral-400 hover:text-white">
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(p)} aria-label={`Delete ${p.name}`} className="text-neutral-600 hover:text-red-400">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* create / edit dialog */}
      <Dialog open={dialog.open} onOpenChange={(v) => setDialog((d) => ({ ...d, open: v }))}>
        <DialogContent className="bg-[#151515] border-white/10 max-w-xl max-h-[88vh] overflow-y-auto thin-scrollbar">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">{dialog.product ? `Edit — ${dialog.product.name}` : 'New product'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-neutral-300">Name</Label>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="mt-1.5 h-10 bg-white/5 border-white/10 text-white" />
              </div>
              <div>
                <Label className="text-neutral-300">Category</Label>
                <Select value={form.categoryId} onValueChange={(v) => setForm((f) => ({ ...f, categoryId: v }))}>
                  <SelectTrigger className="mt-1.5 h-10 bg-white/5 border-white/10 text-white"><SelectValue placeholder="Pick category" /></SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border-white/10 text-white">
                    {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-neutral-300">Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="mt-1.5 min-h-20 bg-white/5 border-white/10 text-white" />
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-neutral-300">Price (₹)</Label>
                <Input type="number" min="1" value={form.priceRupees} onChange={(e) => setForm((f) => ({ ...f, priceRupees: e.target.value }))} className="mt-1.5 h-10 bg-white/5 border-white/10 text-white" />
              </div>
              <div>
                <Label className="text-neutral-300">Compare at (₹)</Label>
                <Input type="number" min="1" value={form.compareRupees} onChange={(e) => setForm((f) => ({ ...f, compareRupees: e.target.value }))} className="mt-1.5 h-10 bg-white/5 border-white/10 text-white" />
              </div>
              <div>
                <Label className="text-neutral-300">Spice level</Label>
                <Select value={String(form.spiceLevel)} onValueChange={(v) => setForm((f) => ({ ...f, spiceLevel: Number(v) }))}>
                  <SelectTrigger className="mt-1.5 h-10 bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border-white/10 text-white">
                    {[0, 1, 2, 3].map((n) => <SelectItem key={n} value={String(n)}>{['None', 'Mild', 'Medium', 'Blazing'][n]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-neutral-300">Image</Label>
              <div className="mt-1.5 flex items-center gap-3">
                { }
                <img src={form.image || '/images/placeholder.png'} alt="" className="w-14 h-14 rounded-xl object-cover bg-white/5 border border-white/10" />
                <label className="flex items-center gap-2 rounded-xl border border-dashed border-white/20 px-4 h-10 cursor-pointer text-xs text-neutral-400 hover:text-white hover:border-white/40 transition-colors">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {uploading ? 'Uploading…' : 'Upload image'}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f) }}
                  />
                </label>
                <Input value={form.image} onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))} placeholder="or paste /images/… URL" className="flex-1 h-10 bg-white/5 border-white/10 text-white text-xs" />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-neutral-300">Ingredients (comma-separated)</Label>
                <Input value={form.ingredients} onChange={(e) => setForm((f) => ({ ...f, ingredients: e.target.value }))} className="mt-1.5 h-10 bg-white/5 border-white/10 text-white" />
              </div>
              <div>
                <Label className="text-neutral-300">Allergens (comma-separated)</Label>
                <Input value={form.allergens} onChange={(e) => setForm((f) => ({ ...f, allergens: e.target.value }))} className="mt-1.5 h-10 bg-white/5 border-white/10 text-white" />
              </div>
            </div>
            <div className="flex flex-wrap gap-5 pt-1">
              <label className="flex items-center gap-2 text-sm text-neutral-300">
                <Checkbox checked={form.isVeg} onCheckedChange={(v) => setForm((f) => ({ ...f, isVeg: !!v }))} /> Vegetarian
              </label>
              <label className="flex items-center gap-2 text-sm text-neutral-300">
                <Checkbox checked={form.isAvailable} onCheckedChange={(v) => setForm((f) => ({ ...f, isAvailable: !!v }))} /> Available
              </label>
              <label className="flex items-center gap-2 text-sm text-neutral-300">
                <Checkbox checked={form.isFeatured} onCheckedChange={(v) => setForm((f) => ({ ...f, isFeatured: !!v }))} /> Featured (best seller)
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setDialog({ open: false, product: null })} className="rounded-full text-neutral-400">Cancel</Button>
              <Button onClick={save} disabled={saving} className="rounded-full bg-primary text-white px-6">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : dialog.product ? 'Save changes' : 'Create product'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

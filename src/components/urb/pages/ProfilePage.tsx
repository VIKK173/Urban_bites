'use client'

import { useCallback, useEffect, useState } from 'react'
import { Heart, MapPin, Package, LogOut, Trash2, Plus, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuthStore } from '@/store/auth-store'
import { useCartStore } from '@/store/cart-store'
import FoodCard, { type FoodCardProduct } from '@/components/urb/FoodCard'
import { get, patch, post, del } from '@/services/api'
import { navigate } from '@/hooks/useHashRoute'
import { toast } from 'sonner'

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

export default function ProfilePage() {
  const { user, status, updateProfile, logout } = useAuthStore()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [addresses, setAddresses] = useState<Address[] | null>(null)
  const [favorites, setFavorites] = useState<FoodCardProduct[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [tab, setTab] = useState('profile')

  useEffect(() => {
    if (status === 'guest') navigate('/login')
  }, [status])

  useEffect(() => {
    if (user) {
      setName(user.name)
      setPhone(user.phone || '')
    }
  }, [user])

  useEffect(() => {
    const t = new URLSearchParams(window.location.hash.split('?')[1] || '').get('tab')
    if (t === 'favorites') setTab('favorites')
  }, [])

  const loadAddresses = useCallback(() => {
    get<{ addresses: Address[] }>('/api/addresses').then((d) => setAddresses(d.addresses)).catch(() => setAddresses([]))
  }, [])

  const loadFavorites = useCallback(async () => {
    try {
      const d = await get<{ products: FoodCardProduct[] }>('/api/favorites')
      setFavorites(d.products)
    } catch {
      setFavorites([])
    }
  }, [])

  useEffect(() => {
    if (!user) return
    loadAddresses()
    loadFavorites()
  }, [user, loadAddresses, loadFavorites])

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await updateProfile({ name, phone })
      toast.success('Profile updated')
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const toggleFavorite = async (productId: string) => {
    try {
      await post('/api/favorites', { productId })
      setFavorites((prev) => prev.filter((p) => p.id !== productId))
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const handleLogout = async () => {
    await logout()
    useCartStore.getState().reset()
    toast.success('Logged out')
    navigate('/')
  }

  if (!user) return <div className="py-24 text-center text-sm text-neutral-500">Loading…</div>

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10 sm:py-14">
      <div className="flex items-center gap-4">
        <span className="grid place-items-center w-14 h-14 rounded-2xl bg-primary/15 text-primary text-xl font-bold uppercase">
          {user.name.charAt(0)}
        </span>
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold">{user.name}</h1>
          <p className="text-sm text-neutral-500">{user.email} · member since {new Date(user.createdAt).getFullYear()}</p>
        </div>
        <Button variant="outline" onClick={handleLogout} className="ml-auto rounded-full border-white/15 text-neutral-300">
          <LogOut className="w-4 h-4 mr-1.5" /> Log out
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="mt-8">
        <TabsList className="bg-white/5 border border-white/10 h-12 p-1 rounded-xl">
          <TabsTrigger value="profile" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white gap-1.5">
            <User className="w-4 h-4" /> Profile
          </TabsTrigger>
          <TabsTrigger value="addresses" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white gap-1.5">
            <MapPin className="w-4 h-4" /> Addresses
          </TabsTrigger>
          <TabsTrigger value="favorites" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white gap-1.5">
            <Heart className="w-4 h-4" /> Favorites
          </TabsTrigger>
          <TabsTrigger value="orders" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white gap-1.5">
            <Package className="w-4 h-4" /> Orders
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <form onSubmit={saveProfile} className="rounded-2xl bg-card border border-white/5 p-6 space-y-4 max-w-md">
            <div>
              <Label htmlFor="pf-name" className="text-neutral-300">Full name</Label>
              <Input id="pf-name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5 h-11 bg-white/5 border-white/10 text-white" />
            </div>
            <div>
              <Label htmlFor="pf-email" className="text-neutral-300">Email (read-only)</Label>
              <Input id="pf-email" value={user.email} disabled className="mt-1.5 h-11 bg-white/5 border-white/10 text-neutral-500" />
            </div>
            <div>
              <Label htmlFor="pf-phone" className="text-neutral-300">Mobile</Label>
              <Input id="pf-phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1.5 h-11 bg-white/5 border-white/10 text-white" placeholder="98765 43210" />
            </div>
            <Button type="submit" disabled={saving} className="rounded-full bg-primary text-white px-8">{saving ? 'Saving…' : 'Save changes'}</Button>
          </form>
        </TabsContent>

        <TabsContent value="addresses" className="mt-6 space-y-3">
          {addresses === null && <p className="text-sm text-neutral-500">Loading addresses…</p>}
          {addresses?.length === 0 && (
            <p className="text-sm text-neutral-500 rounded-2xl border border-dashed border-white/10 p-6 text-center">No saved addresses yet — add one for faster checkout.</p>
          )}
          {addresses?.map((a) => (
            <div key={a.id} className="rounded-2xl bg-card border border-white/5 p-4 flex items-start justify-between gap-3">
              <div className="flex gap-3">
                <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" aria-hidden />
                <div>
                  <p className="text-sm font-semibold flex items-center gap-2">
                    {a.label}
                    {a.isDefault && <span className="rounded-full bg-primary/15 text-primary px-2 py-0.5 text-[10px]">Default</span>}
                  </p>
                  <p className="text-sm text-neutral-400 mt-0.5">{a.fullText}, {a.city} — {a.pincode}</p>
                  <p className="text-xs text-neutral-600 mt-0.5">{a.phone}</p>
                </div>
              </div>
              <div className="flex gap-1">
                {!a.isDefault && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-neutral-400 hover:text-white"
                    onClick={async () => {
                      await patch(`/api/addresses/${a.id}`, { isDefault: true })
                      loadAddresses()
                      toast.success('Default address updated')
                    }}
                  >
                    Make default
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-neutral-600 hover:text-red-400"
                  aria-label={`Delete ${a.label} address`}
                  onClick={async () => {
                    await del(`/api/addresses/${a.id}`)
                    loadAddresses()
                    toast.success('Address removed')
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}

          {showAdd ? (
            <div className="rounded-2xl border border-white/10 p-4 space-y-3">
              <h2 className="text-sm font-semibold flex items-center gap-2"><Plus className="w-4 h-4 text-primary" /> Add address</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <Label htmlFor="ad-full" className="text-neutral-300">Full address</Label>
                  <Input id="ad-full" className="mt-1.5 h-11 bg-white/5 border-white/10 text-white" placeholder="Flat, building, street…" />
                </div>
                <div>
                  <Label htmlFor="ad-city" className="text-neutral-300">City</Label>
                  <Input id="ad-city" defaultValue="Mumbai" className="mt-1.5 h-11 bg-white/5 border-white/10 text-white" />
                </div>
                <div>
                  <Label htmlFor="ad-pin" className="text-neutral-300">Pincode</Label>
                  <Input id="ad-pin" inputMode="numeric" maxLength={6} className="mt-1.5 h-11 bg-white/5 border-white/10 text-white" />
                </div>
                <div>
                  <Label htmlFor="ad-phone" className="text-neutral-300">Phone</Label>
                  <Input id="ad-phone" inputMode="tel" className="mt-1.5 h-11 bg-white/5 border-white/10 text-white" />
                </div>
                <div>
                  <Label htmlFor="ad-label" className="text-neutral-300">Label</Label>
                  <Input id="ad-label" defaultValue="Home" className="mt-1.5 h-11 bg-white/5 border-white/10 text-white" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={async () => {
                    const fullText = (document.getElementById('ad-full') as HTMLInputElement)?.value || ''
                    const city = (document.getElementById('ad-city') as HTMLInputElement)?.value || ''
                    const pincode = (document.getElementById('ad-pin') as HTMLInputElement)?.value || ''
                    const phone = (document.getElementById('ad-phone') as HTMLInputElement)?.value || ''
                    const label = (document.getElementById('ad-label') as HTMLInputElement)?.value || 'Home'
                    try {
                      await post('/api/addresses', { label, fullText, city, state: 'Maharashtra', pincode, phone })
                      loadAddresses()
                      setShowAdd(false)
                      toast.success('Address added')
                    } catch (e) {
                      toast.error((e as Error).message)
                    }
                  }}
                  className="rounded-full bg-primary text-white"
                >
                  Save address
                </Button>
                <Button variant="ghost" onClick={() => setShowAdd(false)} className="rounded-full text-neutral-400">Cancel</Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" onClick={() => setShowAdd(true)} className="rounded-full border-white/15 text-white">
              <Plus className="w-4 h-4 mr-1" /> Add new address
            </Button>
          )}
        </TabsContent>

        <TabsContent value="favorites" className="mt-6">
          {favorites.length === 0 ? (
            <div className="py-14 text-center rounded-2xl border border-dashed border-white/10">
              <Heart className="mx-auto w-9 h-9 text-neutral-600" aria-hidden />
              <p className="mt-3 text-sm text-neutral-500">Nothing saved yet — tap the heart on any dish.</p>
              <Button onClick={() => navigate('/menu')} className="mt-4 rounded-full bg-primary text-white">Browse menu</Button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {favorites.map((p, i) => (
                <FoodCard key={p.id} product={p} index={i} favorited onToggleFavorite={toggleFavorite} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="orders" className="mt-6">
          <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center">
            <Package className="mx-auto w-9 h-9 text-neutral-600" aria-hidden />
            <p className="mt-3 text-sm text-neutral-500">Your full order history lives on its own page.</p>
            <Button onClick={() => navigate('/orders')} className="mt-4 rounded-full bg-primary text-white">View my orders</Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

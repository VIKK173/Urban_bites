'use client'

import { create } from 'zustand'
import { get, post, patch, del } from '@/services/api'

export interface CartProduct {
  id: string
  name: string
  slug: string
  image: string | null
  price: number
  isVeg: boolean
  isAvailable: boolean
  category?: { name: string; slug: string }
}

export interface CartItem {
  id: string
  quantity: number
  notes: string | null
  options: { label: string; price: number }[]
  product: CartProduct
  unitPrice: number
  lineTotal: number
}

export interface CartTotals {
  subtotal: number
  discount: number
  deliveryFee: number
  tax: number
  total: number
  couponApplied: boolean
  couponMessage?: string
}

export interface AppliedCoupon {
  code: string
  type: 'PERCENT' | 'FLAT'
  value: number
  minOrderValue: number
  maxDiscount: number | null
  description: string | null
}

interface CartState {
  items: CartItem[]
  totals: CartTotals | null
  coupon: AppliedCoupon | null
  loading: boolean
  error: string | null
  loadedOnce: boolean
  fetchCart: (couponCode?: string) => Promise<void>
  addItem: (productId: string, quantity?: number, options?: string[], notes?: string) => Promise<void>
  setQuantity: (itemId: string, quantity: number) => Promise<void>
  removeItem: (itemId: string) => Promise<void>
  clearCart: () => Promise<void>
  reset: () => void
}

async function applyCart(payload: unknown) {
  const data = payload as { items: CartItem[]; totals: CartTotals; coupon: AppliedCoupon | null }
  return data
}

export const useCartStore = create<CartState>((set) => ({
  items: [],
  totals: null,
  coupon: null,
  loading: false,
  error: null,
  loadedOnce: false,

  fetchCart: async (couponCode?: string) => {
    set({ loading: true, error: null })
    try {
      const qs = couponCode ? `?coupon=${encodeURIComponent(couponCode)}` : ''
      const data = await applyCart(await get(`/api/cart${qs}`))
      set({ items: data.items, totals: data.totals, coupon: data.coupon, loading: false, loadedOnce: true })
    } catch (e) {
      set({ loading: false, loadedOnce: true, error: (e as Error).message })
    }
  },

  addItem: async (productId, quantity = 1, options = [], notes = '') => {
    const data = await applyCart(await post('/api/cart', { productId, quantity, options, notes }))
    set({ items: data.items, totals: data.totals, coupon: data.coupon })
  },

  setQuantity: async (itemId, quantity) => {
    const data = await applyCart(await patch('/api/cart', { itemId, quantity }))
    set({ items: data.items, totals: data.totals, coupon: data.coupon })
  },

  removeItem: async (itemId) => {
    const data = await applyCart(await del(`/api/cart?itemId=${encodeURIComponent(itemId)}`))
    set({ items: data.items, totals: data.totals, coupon: data.coupon })
  },

  clearCart: async () => {
    const data = await applyCart(await del('/api/cart?all=1'))
    set({ items: data.items, totals: data.totals, coupon: data.coupon })
  },

  reset: () => set({ items: [], totals: null, coupon: null, loadedOnce: false }),
}))

export const cartCount = (items: CartItem[]) => items.reduce((n, i) => n + i.quantity, 0)

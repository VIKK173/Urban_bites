/** Shared serialization helpers for products & settings. */
import { db } from './db'

export interface OptionChoice {
  label: string
  price: number // paise
}
export interface OptionGroup {
  group: string
  required: boolean
  multi: boolean
  choices: OptionChoice[]
}

export function parseJsonArray<T>(raw: string | null | undefined, fallback: T[] = []): T[] {
  if (!raw) return fallback
  try {
    const v = JSON.parse(raw)
    return Array.isArray(v) ? (v as T[]) : fallback
  } catch {
    return fallback
  }
}

export function serializeProduct(p: {
  id: string; name: string; slug: string; description: string; price: number; comparePrice: number | null;
  categoryId: string; category?: { name: string; slug: string } | null; image: string | null; isVeg: boolean;
  spiceLevel: number; ingredients: string; allergens: string; options: string; rating: number;
  ratingCount: number; isAvailable: boolean; isFeatured: boolean; soldCount: number; createdAt: Date;
}) {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    price: p.price,
    comparePrice: p.comparePrice,
    discountPercent: p.comparePrice && p.comparePrice > p.price ? Math.round(((p.comparePrice - p.price) / p.comparePrice) * 100) : 0,
    categoryId: p.categoryId,
    category: p.category ?? undefined,
    image: p.image,
    isVeg: p.isVeg,
    spiceLevel: p.spiceLevel,
    ingredients: parseJsonArray<string>(p.ingredients),
    allergens: parseJsonArray<string>(p.allergens),
    options: parseJsonArray<OptionGroup>(p.options),
    rating: p.rating,
    ratingCount: p.ratingCount,
    isAvailable: p.isAvailable,
    isFeatured: p.isFeatured,
    soldCount: p.soldCount,
    createdAt: p.createdAt,
  }
}

export type PublicSettings = Awaited<ReturnType<typeof getSettings>>

export async function getSettings() {
  let s = await db.restaurantSettings.findUnique({ where: { id: 'main' } })
  if (!s) {
    s = await db.restaurantSettings.create({ data: { id: 'main' } })
  }
  return s
}

/** Safe subset for unauthenticated clients. */
export function publicSettings(s: Awaited<ReturnType<typeof getSettings>>) {
  return {
    deliveryFee: s.deliveryFee,
    freeDeliveryThreshold: s.freeDeliveryThreshold,
    taxPercent: s.taxPercent,
    codEnabled: s.codEnabled,
    etaMinutes: s.etaMinutes,
    offer: {
      title: s.offerTitle,
      text: s.offerText,
      code: s.offerCode,
      discount: s.offerDiscount,
      active: s.offerActive,
    },
    contact: { address: s.address, phone: s.phone, email: s.email, openHours: s.openHours, mapLat: s.mapLat, mapLng: s.mapLng },
  }
}

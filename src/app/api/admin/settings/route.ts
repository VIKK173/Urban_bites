import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth'
import { ok, parseBody, route } from '@/lib/api'
import { getSettings, publicSettings } from '@/lib/catalog'
import { db } from '@/lib/db'

export const GET = route(async (req: NextRequest) => {
  await requireAdmin(req)
  const settings = await getSettings()
  return ok({ settings })
})

const schema = z.object({
  deliveryFee: z.number().int().min(0).max(100000),
  freeDeliveryThreshold: z.number().int().min(0).max(10000000),
  taxPercent: z.number().min(0).max(40),
  codEnabled: z.boolean(),
  etaMinutes: z.number().int().min(10).max(180),
  offerTitle: z.string().trim().max(60),
  offerText: z.string().trim().max(300),
  offerCode: z.string().trim().max(30),
  offerDiscount: z.number().int().min(0).max(100),
  offerActive: z.boolean(),
  address: z.string().trim().max(300),
  phone: z.string().trim().max(30),
  email: z.string().trim().max(120),
  openHours: z.string().trim().max(120),
  mapLat: z.number().min(-90).max(90),
  mapLng: z.number().min(-180).max(180),
})

export const PATCH = route(async (req: NextRequest) => {
  await requireAdmin(req)
  const body = await parseBody(req, schema)
  await getSettings() // ensure row exists
  const settings = await db.restaurantSettings.update({ where: { id: 'main' }, data: body })
  return ok({ settings: publicSettings(settings) })
})

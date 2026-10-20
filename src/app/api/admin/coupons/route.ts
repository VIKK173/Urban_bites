import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ApiError, ok, parseBody, route } from '@/lib/api'

export const GET = route(async (req: NextRequest) => {
  await requireAdmin(req)
  const coupons = await db.coupon.findMany({ orderBy: { createdAt: 'desc' } })
  return ok({ coupons })
})

const schema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{3,20}$/, 'Code must be 3-20 letters/numbers'),
  description: z.string().trim().max(200).optional().or(z.literal('')),
  type: z.enum(['PERCENT', 'FLAT']),
  value: z.number().int().min(1), // percent 1-100 or paise
  minOrderValue: z.number().int().min(0).default(0),
  maxDiscount: z.number().int().min(1).nullable().optional(),
  usageLimit: z.number().int().min(1).nullable().optional(),
  validUntil: z.string().datetime().nullable().optional(),
  isActive: z.boolean().default(true),
})

export const POST = route(async (req: NextRequest) => {
  const admin = await requireAdmin(req)
  const body = await parseBody(req, schema)

  if (body.type === 'PERCENT' && body.value > 100) {
    throw new ApiError(400, 'Percentage discount cannot exceed 100', 'BAD_VALUE')
  }
  const exists = await db.coupon.findUnique({ where: { code: body.code } })
  if (exists) throw new ApiError(409, 'A coupon with this code already exists', 'CODE_TAKEN')

  const coupon = await db.coupon.create({
    data: {
      code: body.code,
      description: body.description || null,
      type: body.type,
      value: body.value,
      minOrderValue: body.minOrderValue,
      maxDiscount: body.type === 'PERCENT' ? body.maxDiscount ?? null : null,
      usageLimit: body.usageLimit ?? null,
      validUntil: body.validUntil ? new Date(body.validUntil) : null,
      isActive: body.isActive,
      createdById: admin.id,
    },
  })
  return ok({ coupon }, 201)
})

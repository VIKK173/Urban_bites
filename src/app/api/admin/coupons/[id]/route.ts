import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ApiError, ok, parseBody, route } from '@/lib/api'

const patchSchema = z.object({
  description: z.string().trim().max(200).optional().or(z.literal('')),
  value: z.number().int().min(1).optional(),
  minOrderValue: z.number().int().min(0).optional(),
  maxDiscount: z.number().int().min(1).nullable().optional(),
  usageLimit: z.number().int().min(1).nullable().optional(),
  isActive: z.boolean().optional(),
  validUntil: z.string().datetime().nullable().optional(),
})

export const PATCH = route(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  await requireAdmin(req)
  const { id } = await ctx.params
  const body = await parseBody(req, patchSchema)

  const coupon = await db.coupon.findUnique({ where: { id } })
  if (!coupon) throw new ApiError(404, 'Coupon not found', 'NOT_FOUND')
  if (coupon.type === 'PERCENT' && (body.value ?? 0) > 100) {
    throw new ApiError(400, 'Percentage discount cannot exceed 100', 'BAD_VALUE')
  }

  const updated = await db.coupon.update({
    where: { id },
    data: {
      ...body,
      description: body.description === '' ? null : body.description,
      validUntil: body.validUntil === undefined ? undefined : body.validUntil ? new Date(body.validUntil) : null,
    },
  })
  return ok({ coupon: updated })
})

export const DELETE = route(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  await requireAdmin(req)
  const { id } = await ctx.params
  const coupon = await db.coupon.findUnique({ where: { id } })
  if (!coupon) throw new ApiError(404, 'Coupon not found', 'NOT_FOUND')
  await db.coupon.delete({ where: { id } })
  return ok({ deleted: true })
})

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { ApiError, ok, parseBody, route } from '@/lib/api'

const PATCH_SCHEMA = z.object({
  label: z.string().trim().min(1).max(40).optional(),
  fullText: z.string().trim().min(8).max(300).optional(),
  city: z.string().trim().min(2).max(60).optional(),
  state: z.string().trim().min(2).max(60).optional(),
  pincode: z.string().trim().regex(/^\d{6}$/).optional(),
  phone: z.string().trim().regex(/^(\+91[\s-]?)?[6-9]\d{9}$/).optional(),
  isDefault: z.boolean().optional(),
})

async function ownedAddress(userId: string, id: string) {
  const address = await db.address.findUnique({ where: { id } })
  if (!address || address.userId !== userId) throw new ApiError(404, 'Address not found', 'NOT_FOUND')
  return address
}

export const PATCH = route(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser(req)
  const { id } = await ctx.params
  await ownedAddress(user.id, id)
  const body = await parseBody(req, PATCH_SCHEMA)

  const address = await db.$transaction(async (tx) => {
    if (body.isDefault) {
      await tx.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } })
    }
    return tx.address.update({ where: { id }, data: body })
  })
  return ok({ address })
})

export const DELETE = route(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser(req)
  const { id } = await ctx.params
  await ownedAddress(user.id, id)
  await db.address.delete({ where: { id } })
  return ok({ deleted: true })
})

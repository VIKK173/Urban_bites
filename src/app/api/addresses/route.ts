import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { ok, parseBody, route } from '@/lib/api'

export const GET = route(async (req: NextRequest) => {
  const user = await requireUser(req)
  const addresses = await db.address.findMany({
    where: { userId: user.id },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  })
  return ok({ addresses })
})

const schema = z.object({
  label: z.string().trim().min(1).max(40).default('Home'),
  fullText: z.string().trim().min(8, 'Address must be at least 8 characters').max(300),
  city: z.string().trim().min(2).max(60),
  state: z.string().trim().min(2).max(60),
  pincode: z.string().trim().regex(/^\d{6}$/, 'Pincode must be 6 digits'),
  phone: z.string().trim().regex(/^(\+91[\s-]?)?[6-9]\d{9}$/, 'Enter a valid Indian mobile number'),
  isDefault: z.boolean().optional(),
})

export const POST = route(async (req: NextRequest) => {
  const user = await requireUser(req)
  const body = await parseBody(req, schema)
  const count = await db.address.count({ where: { userId: user.id } })

  const address = await db.$transaction(async (tx) => {
    if (body.isDefault || count === 0) {
      await tx.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } })
    }
    return tx.address.create({
      data: { ...body, isDefault: body.isDefault || count === 0, userId: user.id },
    })
  })
  return ok({ address }, 201)
})

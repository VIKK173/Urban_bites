import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { ok, parseBody, route } from '@/lib/api'

export const GET = route(async (req: NextRequest) => {
  const user = await requireUser(req)
  return ok({ user })
})

const patchSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  phone: z.string().trim().regex(/^(\+91[\s-]?)?[6-9]\d{9}$/, 'Enter a valid Indian mobile number').optional().or(z.literal('')),
})

export const PATCH = route(async (req: NextRequest) => {
  const user = await requireUser(req)
  const body = await parseBody(req, patchSchema)
  const updated = await db.user.update({
    where: { id: user.id },
    data: { name: body.name, phone: body.phone || null },
    select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true },
  })
  return ok({ user: updated })
})

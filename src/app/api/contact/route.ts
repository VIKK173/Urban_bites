import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { clientIp, ok, parseBody, rateLimit, route } from '@/lib/api'

const schema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  phone: z.string().trim().max(20).optional().or(z.literal('')),
  subject: z.string().trim().max(120).optional().or(z.literal('')),
  message: z.string().trim().min(10, 'Message must be at least 10 characters').max(2000),
})

export const POST = route(async (req: NextRequest) => {
  rateLimit(`contact:${clientIp(req)}`, 6, 60_000)
  const body = await parseBody(req, schema)
  const user = await getCurrentUser(req)

  await db.contactMessage.create({
    data: {
      userId: user?.id ?? null,
      name: body.name,
      email: body.email,
      phone: body.phone || null,
      subject: body.subject || null,
      message: body.message,
    },
  })
  return ok({ message: 'Message received! Our team replies within one working day.' }, 201)
})

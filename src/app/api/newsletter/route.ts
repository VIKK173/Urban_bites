import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { ApiError, clientIp, ok, parseBody, rateLimit, route } from '@/lib/api'

const schema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
})

export const POST = route(async (req: NextRequest) => {
  rateLimit(`newsletter:${clientIp(req)}`, 8, 60_000)
  const { email } = await parseBody(req, schema)

  const existing = await db.newsletterSubscriber.findUnique({ where: { email } })
  if (existing) {
    throw new ApiError(409, "You're already on the list — fresh deals land in your inbox soon!", 'ALREADY_SUBSCRIBED')
  }
  await db.newsletterSubscriber.create({ data: { email } })
  return ok({ message: 'Subscribed! Welcome to the Urban Bites family.' }, 201)
})

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { hashPassword, setAuthCookie, signToken } from '@/lib/auth'
import { ApiError, clientIp, ok, parseBody, rateLimit, route } from '@/lib/api'

const schema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  phone: z.string().trim().regex(/^(\+91[\s-]?)?[6-9]\d{9}$/, 'Enter a valid Indian mobile number').optional().or(z.literal('')),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password is too long')
    .regex(/[A-Za-z]/, 'Password must contain a letter')
    .regex(/\d/, 'Password must contain a number'),
})

export const POST = route(async (req: NextRequest) => {
  rateLimit(`register:${clientIp(req)}`, 10, 60_000)
  const body = await parseBody(req, schema)

  const existing = await db.user.findUnique({ where: { email: body.email } })
  if (existing) {
    throw new ApiError(409, 'An account with this email already exists. Try logging in.', 'EMAIL_TAKEN')
  }

  const user = await db.user.create({
    data: {
      name: body.name,
      email: body.email,
      phone: body.phone || null,
      passwordHash: await hashPassword(body.password),
      role: 'CUSTOMER', // role is NEVER accepted from the client
    },
    select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true },
  })

  const token = signToken({ sub: user.id, email: user.email, name: user.name, role: 'CUSTOMER' })
  const res = ok({ user }, 201)
  return setAuthCookie(res as NextResponse, token)
})

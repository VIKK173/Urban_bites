import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { setAuthCookie, signToken, verifyPassword } from '@/lib/auth'
import { ApiError, clientIp, ok, parseBody, rateLimit, route } from '@/lib/api'

const schema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

export const POST = route(async (req: NextRequest) => {
  rateLimit(`login:${clientIp(req)}`, 15, 60_000)
  const body = await parseBody(req, schema)

  const user = await db.user.findUnique({ where: { email: body.email } })
  // Same generic error for unknown email / wrong password (no account enumeration)
  if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
    throw new ApiError(401, 'Incorrect email or password.', 'BAD_CREDENTIALS')
  }

  const token = signToken({ sub: user.id, email: user.email, name: user.name, role: user.role as 'CUSTOMER' | 'ADMIN' })
  const res = ok({
    user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, createdAt: user.createdAt },
  })
  return setAuthCookie(res as NextResponse, token)
})

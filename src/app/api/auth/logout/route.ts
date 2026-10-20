import { NextRequest } from 'next/server'
import { clearAuthCookie } from '@/lib/auth'
import { ok, route } from '@/lib/api'

export const POST = route(async (_req: NextRequest) => {
  const res = ok({ message: 'Logged out' })
  return clearAuthCookie(res)
})

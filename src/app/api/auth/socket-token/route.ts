import { NextRequest } from 'next/server'
import { signToken, requireUser } from '@/lib/auth'
import { ok, route } from '@/lib/api'

/**
 * GET /api/auth/socket-token — short-lived JWT for the Socket.IO handshake.
 * The auth cookie is httpOnly (unreadable from JS), so the socket client
 * exchanges its session for a scoped token instead.
 */
export const GET = route(async (req: NextRequest) => {
  const user = await requireUser(req)
  const token = signToken({ sub: user.id, email: user.email, name: user.name, role: user.role as 'CUSTOMER' | 'ADMIN' })
  return ok({ token })
})

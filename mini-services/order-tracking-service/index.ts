/**
 * Urban Bites — real-time order tracking service (Socket.IO)
 *
 * Frontend  : io('/?XTransformPort=3003', { path default }) — via gateway
 * Internal  : POST http://localhost:3013/internal/emit (Next.js API → service,
 *             secret-guarded, NOT exposed through the gateway)
 *
 * Rooms : order:<orderId> — customer tracking a specific order
 *         user:<userId>   — all of a user's orders
 *         admin           — admin console live updates
 */
import { createServer } from 'http'
import { Server } from 'socket.io'
import jwt from 'jsonwebtoken'

const PORT = Number(process.env.SOCKET_PORT || 3003)
const INTERNAL_PORT = Number(process.env.SOCKET_INTERNAL_PORT || 3013)
const JWT_SECRET = process.env.JWT_SECRET || ''

const io = new Server(createServer(), {
  // DO NOT change the path — the gateway forwards socket.io traffic here
  path: '/',
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000,
})

interface TokenPayload {
  sub: string
  email: string
  name: string
  role: 'CUSTOMER' | 'ADMIN'
}

interface OrderUpdate {
  orderId: string
  orderNumber: string
  userId: string
  status: string
  statusLabel: string
  eventType: string
  etaMinutes?: number
  message?: string
  at: string
}

function verify(token?: string): TokenPayload | null {
  if (!token || !JWT_SECRET) return null
  try {
    return jwt.verify(token.replace(/^Bearer\s+/i, ''), JWT_SECRET) as TokenPayload
  } catch {
    return null
  }
}

io.on('connection', (socket) => {
  // ------- authenticate -------
  socket.on('auth', ({ token }: { token?: string }, ack?: (res: unknown) => void) => {
    const payload = verify(token)
    if (!payload) {
      ack?.({ ok: false, error: 'Invalid or missing token' })
      socket.emit('auth:error', { message: 'Authentication failed' })
      return
    }
    socket.data.user = payload
    socket.join(`user:${payload.sub}`)
    if (payload.role === 'ADMIN') socket.join('admin')
    ack?.({ ok: true, userId: payload.sub, role: payload.role })
  })

  // ------- subscribe to a specific order (after API-level ownership check) -------
  socket.on('order:subscribe', ({ orderId }: { orderId: string }, ack?: (res: unknown) => void) => {
    const user = socket.data.user as TokenPayload | undefined
    if (!user) return ack?.({ ok: false, error: 'Authenticate first' })
    if (!orderId || typeof orderId !== 'string') return ack?.({ ok: false, error: 'orderId required' })
    socket.join(`order:${orderId}`)
    ack?.({ ok: true, room: `order:${orderId}` })
  })

  socket.on('order:unsubscribe', ({ orderId }: { orderId: string }) => {
    if (orderId && typeof orderId === 'string') socket.leave(`order:${orderId}`)
  })

  socket.on('disconnect', () => {
    socket.data.user = undefined
  })
})

// ------------------------------------------------------------------
// Internal HTTP API (same process, dedicated port, gateway-invisible)
// ------------------------------------------------------------------
const internal = createServer((req, res) => {
  const respond = (code: number, body: unknown) => {
    res.writeHead(code, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(body))
  }

  if (req.method === 'GET') {
    return respond(200, { ok: true, service: 'order-tracking', clients: io.engine.clientsCount })
  }

  if (req.method === 'POST' && req.url === '/internal/emit') {
    let body = ''
    req.on('data', (c) => {
      body += c
      if (body.length > 1_000_000) req.destroy()
    })
    req.on('end', () => {
      try {
        const { secret, rooms, event, data } = JSON.parse(body) as {
          secret?: string; rooms?: unknown; event?: unknown; data?: OrderUpdate
        }
        if (!process.env.INTERNAL_EMIT_SECRET || secret !== process.env.INTERNAL_EMIT_SECRET) {
          return respond(401, { ok: false, error: 'bad secret' })
        }
        if (!Array.isArray(rooms) || typeof event !== 'string') {
          return respond(400, { ok: false, error: 'rooms[] and event required' })
        }
        for (const room of rooms) io.to(String(room)).emit(event, data)
        respond(200, { ok: true, rooms, event })
      } catch {
        respond(400, { ok: false, error: 'bad json' })
      }
    })
    return
  }

  respond(404, { ok: false, error: 'not found' })
})

internal.listen(INTERNAL_PORT, () => {
  console.log(`Order tracking internal API on port ${INTERNAL_PORT}`)
})

io.engine.on('connection', () => {})

const httpServer = io.httpServer!
httpServer.listen(PORT, () => {
  console.log(`Order tracking socket service running on port ${PORT}`)
  if (!JWT_SECRET) console.warn('WARN: JWT_SECRET not set — socket auth will reject all clients')
})

process.on('SIGTERM', () => {
  internal.close()
  httpServer.close(() => process.exit(0))
})
process.on('SIGINT', () => {
  internal.close()
  httpServer.close(() => process.exit(0))
})

'use client'

/**
 * Socket.IO singleton for real-time order tracking.
 * Connects through the gateway: io('/?XTransformPort=3003').
 * Auth uses a short-lived token minted by /api/auth/socket-token because the
 * session cookie is httpOnly. Re-authenticates on every (re)connect so the
 * user/admin rooms survive gateway or service restarts, and dispatches
 * 'ub:socket-ready' so pages can re-subscribe to order rooms and refetch.
 */
import { io, type Socket } from 'socket.io-client'
import { get } from './api'

let socket: Socket | null = null
let connecting: Promise<Socket> | null = null

export interface OrderUpdate {
  orderId: string
  orderNumber: string
  userId: string
  status: 'PLACED' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED'
  statusLabel: string
  eventType: string
  etaMinutes?: number
  message?: string
  at: string
}

export async function getOrderSocket(): Promise<Socket> {
  if (socket?.connected) return socket
  if (connecting) return connecting

  connecting = (async () => {
    const { token } = await get<{ token: string }>('/api/auth/socket-token')
    const s = io('/?XTransformPort=3003', {
      transports: ['websocket', 'polling'],
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 1200,
      timeout: 10000,
    })

    let firstAuth: ((ok: boolean) => void) | null = null

    // persistent handler — re-authenticates on every (re)connect
    s.on('connect', () => {
      s.emit('auth', { token }, (res: { ok?: boolean } | undefined) => {
        if (res?.ok) {
          window.dispatchEvent(new CustomEvent('ub:socket-ready'))
          firstAuth?.(true)
          firstAuth = null
        } else {
          firstAuth?.(false)
          firstAuth = null
        }
      })
    })
    s.on('connect_error', () => {
      firstAuth?.(false)
      firstAuth = null
    })

    // wait for the first successful auth
    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('Socket connection timeout')), 12000)
      firstAuth = (ok) => {
        clearTimeout(t)
        if (ok) resolve()
        else reject(new Error('Socket authentication failed'))
      }
    })

    socket = s
    connecting = null
    return s
  })()

  try {
    return await connecting
  } catch (e) {
    connecting = null
    throw e
  }
}

export function disconnectSocket() {
  socket?.disconnect()
  socket = null
  connecting = null
}

/**
 * API helpers — consistent response envelope, centralised error handling,
 * body validation with zod, and a lightweight in-memory rate limiter.
 */
import { NextRequest, NextResponse } from 'next/server'
import { ZodError, ZodType } from 'zod'
import { AuthError } from './auth'

export interface ApiErrorShape {
  code: string
  message: string
  details?: unknown
}

export class ApiError extends Error {
  status: number
  code: string
  details?: unknown
  constructor(status: number, message: string, code = 'ERROR', details?: unknown) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status })
}

export function fail(status: number, message: string, code = 'ERROR', details?: unknown) {
  return NextResponse.json({ success: false, error: { code, message, details } satisfies ApiErrorShape }, { status })
}

/** Wraps a route handler with centralised error handling. */
export function route<Args extends unknown[]>(
  handler: (req: NextRequest, ...args: Args) => Promise<NextResponse>,
) {
  return async (req: NextRequest, ...args: Args): Promise<NextResponse> => {
    try {
      return await handler(req, ...args)
    } catch (err) {
      if (err instanceof AuthError) {
        return fail(err.status, err.message, err.status === 403 ? 'FORBIDDEN' : 'UNAUTHORIZED')
      }
      if (err instanceof ApiError) {
        return fail(err.status, err.message, err.code, err.details)
      }
      if (err instanceof ZodError) {
        return fail(400, 'Validation failed', 'VALIDATION_ERROR', err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })))
      }
      console.error('[api] unhandled error:', err)
      return fail(500, 'Something went wrong on our side. Please try again.', 'INTERNAL')
    }
  }
}

/** Parse + validate a JSON body against a zod schema. */
export async function parseBody<T>(req: NextRequest, schema: ZodType<T>): Promise<T> {
  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    throw new ApiError(400, 'Request body must be valid JSON', 'BAD_JSON')
  }
  return schema.parse(raw)
}

// ------------------------------------------------------------ rate limiter
type Bucket = { count: number; resetAt: number }
const buckets = new Map<string, Bucket>()

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now()
  const b = buckets.get(key)
  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    if (buckets.size > 5000) {
      // opportunistic cleanup
      for (const [k, v] of buckets) if (v.resetAt < now) buckets.delete(k)
    }
    return
  }
  b.count += 1
  if (b.count > limit) {
    throw new ApiError(429, 'Too many requests. Please slow down and try again shortly.', 'RATE_LIMITED')
  }
}

export function clientIp(req: NextRequest): string {
  return (
    req.headers.get('x-real-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  )
}

export function parseIntParam(value: string | null, fallback: number, min: number, max: number): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, Math.trunc(n)))
}

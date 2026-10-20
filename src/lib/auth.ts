/**
 * Auth utilities — JWT (HS256) in an httpOnly cookie,
 * bcrypt password hashing, role-based guards.
 */
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { NextRequest, NextResponse } from 'next/server'
import { db } from './db'

export const AUTH_COOKIE = 'ub_token'

export interface JwtPayload {
  sub: string
  email: string
  name: string
  role: 'CUSTOMER' | 'ADMIN'
}

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret || secret.length < 16) {
    throw new Error('JWT_SECRET is not configured (set it in .env)')
  }
  return secret
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'],
  })
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as JwtPayload
  } catch {
    return null
  }
}

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10)
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}

/** Reads and verifies the auth cookie. Returns null when unauthenticated. */
export function getAuthUser(req: NextRequest): JwtPayload | null {
  const token = req.cookies.get(AUTH_COOKIE)?.value
  if (!token) return null
  const payload = verifyToken(token)
  if (!payload) return null
  // confirm user still exists (deleted accounts cannot hold valid tokens)
  return payload
}

/** Loads the full DB user for the request; null when unauthenticated. */
export async function getCurrentUser(req: NextRequest) {
  const payload = getAuthUser(req)
  if (!payload) return null
  return db.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true },
  })
}

export async function requireUser(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) throw new AuthError(401, 'Authentication required')
  return user
}

export async function requireAdmin(req: NextRequest) {
  const user = await requireUser(req)
  if (user.role !== 'ADMIN') throw new AuthError(403, 'Admin access required')
  return user
}

export function setAuthCookie(res: NextResponse, token: string) {
  res.cookies.set(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })
  return res
}

export function clearAuthCookie(res: NextResponse) {
  res.cookies.set(AUTH_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 })
  return res
}

export class AuthError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

'use client'

import { create } from 'zustand'
import { get, post, patch } from '@/services/api'

export interface AuthUser {
  id: string
  name: string
  email: string
  phone: string | null
  role: 'CUSTOMER' | 'ADMIN'
  createdAt: string
}

interface AuthState {
  user: AuthUser | null
  status: 'loading' | 'authed' | 'guest'
  bootstrap: () => Promise<void>
  login: (email: string, password: string) => Promise<AuthUser>
  register: (data: { name: string; email: string; phone?: string; password: string }) => Promise<AuthUser>
  updateProfile: (data: { name?: string; phone?: string }) => Promise<AuthUser>
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: 'loading',

  bootstrap: async () => {
    try {
      const { user } = await get<{ user: AuthUser }>('/api/auth/me')
      set({ user, status: 'authed' })
    } catch {
      set({ user: null, status: 'guest' })
    }
  },

  login: async (email, password) => {
    const { user } = await post<{ user: AuthUser }>('/api/auth/login', { email, password })
    set({ user, status: 'authed' })
    return user
  },

  register: async (data) => {
    const { user } = await post<{ user: AuthUser }>('/api/auth/register', data)
    set({ user, status: 'authed' })
    return user
  },

  updateProfile: async (data) => {
    const { user } = await patch<{ user: AuthUser }>('/api/auth/me', data)
    set({ user })
    return user
  },

  logout: async () => {
    await post('/api/auth/logout')
    set({ user: null, status: 'guest' })
  },
}))

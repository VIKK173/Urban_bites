'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Flame, Loader2, LogIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/store/auth-store'
import { navigate } from '@/hooks/useHashRoute'
import { useCartStore } from '@/store/cart-store'
import { toast } from 'sonner'

export default function LoginPage() {
  const { login, user, status } = useAuthStore()
  const fetchCart = useCartStore((s) => s.fetchCart)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (status === 'authed' && user) navigate('/')
  }, [user, status])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    try {
      const u = await login(email, password)
      toast.success(`Welcome back, ${u.name.split(' ')[0]}!`)
      fetchCart()
      navigate(u.role === 'ADMIN' ? '/admin' : '/')
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-14 sm:py-20">
      <div className="rounded-3xl border border-white/10 bg-card p-8">
        <div className="text-center">
          <span className="mx-auto grid place-items-center w-12 h-12 rounded-2xl bg-primary text-white glow-red">
            <Flame className="w-6 h-6" aria-hidden />
          </span>
          <h1 className="font-display mt-4 text-3xl font-bold">WELCOME BACK</h1>
          <p className="mt-2 text-sm text-neutral-500">Log in to track orders, save favourites and check out faster.</p>
        </div>

        <form onSubmit={submit} className="mt-7 space-y-4">
          <div>
            <Label htmlFor="login-email" className="text-neutral-300">Email</Label>
            <Input
              id="login-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 h-11 bg-white/5 border-white/10 text-white placeholder:text-neutral-600"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="login-password" className="text-neutral-300">Password</Label>
              <Link href="#/support" className="text-xs text-primary hover:underline">Forgot password?</Link>
            </div>
            <Input
              id="login-password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 h-11 bg-white/5 border-white/10 text-white placeholder:text-neutral-600"
              placeholder="••••••••"
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full h-12 rounded-full bg-primary hover:bg-primary/90 font-bold">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LogIn className="w-4 h-4 mr-2" />}
            {loading ? 'Logging in…' : 'Log In'}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-neutral-500">
          New to Urban Bites?{' '}
          <Link href="#/register" className="text-primary font-semibold hover:underline">Create an account</Link>
        </p>
      </div>
    </div>
  )
}

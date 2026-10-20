'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Flame, Loader2, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/store/auth-store'
import { navigate } from '@/hooks/useHashRoute'
import { toast } from 'sonner'

export default function RegisterPage() {
  const { register, user, status } = useAuthStore()
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (status === 'authed' && user) navigate('/')
  }, [user, status])

  const validate = () => {
    const e: Record<string, string> = {}
    if (form.name.trim().length < 2) e.name = 'Name must be at least 2 characters'
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Enter a valid email address'
    if (form.phone && !/^(\+91[\s-]?)?[6-9]\d{9}$/.test(form.phone)) e.phone = 'Enter a valid Indian mobile number'
    if (form.password.length < 8) e.password = 'At least 8 characters'
    else if (!/[A-Za-z]/.test(form.password)) e.password = 'Include at least one letter'
    else if (!/\d/.test(form.password)) e.password = 'Include at least one number'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    if (!validate()) return
    setLoading(true)
    try {
      const u = await register({
        name: form.name,
        email: form.email,
        phone: form.phone || undefined,
        password: form.password,
      })
      toast.success(`Welcome to Urban Bites, ${u.name.split(' ')[0]}!`)
      navigate('/')
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
          <h1 className="font-display mt-4 text-3xl font-bold">JOIN THE CLUB</h1>
          <p className="mt-2 text-sm text-neutral-500">One account for orders, tracking, favourites and member-only deals.</p>
        </div>

        <form onSubmit={submit} className="mt-7 space-y-4" noValidate>
          <div>
            <Label htmlFor="reg-name" className="text-neutral-300">Full name</Label>
            <Input
              id="reg-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="mt-1.5 h-11 bg-white/5 border-white/10 text-white placeholder:text-neutral-600"
              placeholder="Priya Sharma"
              autoComplete="name"
              aria-invalid={!!errors.name}
            />
            {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name}</p>}
          </div>
          <div>
            <Label htmlFor="reg-email" className="text-neutral-300">Email</Label>
            <Input
              id="reg-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="mt-1.5 h-11 bg-white/5 border-white/10 text-white placeholder:text-neutral-600"
              placeholder="you@example.com"
              autoComplete="email"
              aria-invalid={!!errors.email}
            />
            {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email}</p>}
          </div>
          <div>
            <Label htmlFor="reg-phone" className="text-neutral-300">Mobile (optional)</Label>
            <Input
              id="reg-phone"
              inputMode="tel"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className="mt-1.5 h-11 bg-white/5 border-white/10 text-white placeholder:text-neutral-600"
              placeholder="98765 43210"
              autoComplete="tel"
              aria-invalid={!!errors.phone}
            />
            {errors.phone && <p className="mt-1 text-xs text-red-400">{errors.phone}</p>}
          </div>
          <div>
            <Label htmlFor="reg-password" className="text-neutral-300">Password</Label>
            <Input
              id="reg-password"
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className="mt-1.5 h-11 bg-white/5 border-white/10 text-white placeholder:text-neutral-600"
              placeholder="Min 8 chars with a number"
              autoComplete="new-password"
              aria-invalid={!!errors.password}
            />
            {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password}</p>}
          </div>
          <Button type="submit" disabled={loading} className="w-full h-12 rounded-full bg-primary hover:bg-primary/90 font-bold">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
            {loading ? 'Creating account…' : 'Sign Up'}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-neutral-500">
          Already have an account?{' '}
          <Link href="#/login" className="text-primary font-semibold hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  )
}

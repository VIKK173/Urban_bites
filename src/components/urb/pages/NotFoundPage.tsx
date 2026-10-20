'use client'

import { Ghost } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { navigate } from '@/hooks/useHashRoute'

export default function NotFoundPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-28 text-center">
      <Ghost className="mx-auto w-12 h-12 text-neutral-600" aria-hidden />
      <h1 className="font-display mt-6 text-6xl font-bold text-primary">404</h1>
      <p className="font-display mt-2 text-xl font-semibold">This dish doesn&apos;t exist</p>
      <p className="mt-3 text-sm text-neutral-500 leading-relaxed">
        The page you&apos;re looking for was eaten, moved, or never cooked. Let&apos;s get you back to the good stuff.
      </p>
      <div className="mt-7 flex justify-center gap-3">
        <Button onClick={() => navigate('/')} className="rounded-full bg-primary text-white px-7">Go home</Button>
        <Button variant="outline" onClick={() => navigate('/menu')} className="rounded-full border-white/15 text-white px-7">Browse menu</Button>
      </div>
    </div>
  )
}

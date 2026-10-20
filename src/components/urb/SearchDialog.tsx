'use client'

import { useEffect, useState } from 'react'
import { get } from '@/services/api'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import { navigate } from '@/hooks/useHashRoute'
import { formatINR } from '@/lib/money'

interface Suggestion {
  id: string
  name: string
  slug: string
  image: string | null
  price: number
  isVeg: boolean
}

export default function SearchDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    const term = q.trim()
    if (term.length < 2) {
      setResults([])
      return
    }
    const t = setTimeout(async () => {
      setLoading(true)
      try {
        const data = await get<{ products: Suggestion[] }>(`/api/products?search=${encodeURIComponent(term)}&limit=8&available=true`)
        setResults(data.products)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 250)
    return () => clearTimeout(t)
  }, [q, open])

  const go = (slug: string) => {
    onOpenChange(false)
    navigate(`/product/${slug}`)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#151515] border-white/10 max-w-lg p-0 overflow-hidden top-[15%] translate-y-0">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="sr-only">Search the menu</DialogTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <Input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search burgers, pizza, wraps…"
              className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-neutral-500 h-11"
              aria-label="Search food"
            />
          </div>
        </DialogHeader>
        <div className="max-h-80 overflow-y-auto thin-scrollbar px-2 pb-2">
          {q.trim().length >= 2 && !loading && results.length === 0 && (
            <p className="text-sm text-neutral-500 text-center py-8">No dishes match “{q}”. Try another craving.</p>
          )}
          {loading && <div className="py-8 text-center text-sm text-neutral-500">Searching…</div>}
          {q.trim().length < 2 && (
            <div className="py-8 text-center text-sm text-neutral-500">Type at least 2 letters — try “blaze” or “shake”.</div>
          )}
          {results.map((r) => (
            <button
              key={r.id}
              onClick={() => go(r.slug)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 text-left transition-colors"
            >
              { }
              <img src={r.image || '/images/placeholder.png'} alt="" className="w-11 h-11 rounded-lg object-cover bg-white/5" loading="lazy" />
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-medium text-white truncate">{r.name}</span>
                <span className="text-xs text-neutral-500">{r.isVeg ? 'Veg' : 'Non-veg'}</span>
              </span>
              <span className="text-sm font-semibold text-primary">{formatINR(r.price)}</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

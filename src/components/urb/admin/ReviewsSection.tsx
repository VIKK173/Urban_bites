'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, X, Trash2, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { get, patch, del } from '@/services/api'
import { toast } from 'sonner'

interface AdminReview {
  id: string
  rating: number
  title: string | null
  comment: string
  isApproved: boolean
  createdAt: string
  user: { name: string; email: string }
  product: { name: string; slug: string; image: string | null }
}

export default function ReviewsSection() {
  const [reviews, setReviews] = useState<AdminReview[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'approved' | 'pending'>('all')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const qs = filter === 'approved' ? '?approved=true' : filter === 'pending' ? '?approved=false' : ''
      const d = await get<{ reviews: AdminReview[] }>(`/api/admin/reviews${qs}`)
      setReviews(d.reviews)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => { load() }, [load])

  const setApproved = async (r: AdminReview, isApproved: boolean) => {
    try {
      await patch(`/api/admin/reviews/${r.id}`, { isApproved })
      toast.success(isApproved ? 'Review approved' : 'Review hidden')
      load()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const remove = async (r: AdminReview) => {
    if (!confirm(`Delete this review of "${r.product.name}"?`)) return
    try {
      await del(`/api/admin/reviews/${r.id}`)
      toast.success('Review deleted')
      load()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold">REVIEW MODERATION</h1>
          <p className="text-xs text-neutral-500">Approve, hide or remove reviews — ratings recompute automatically.</p>
        </div>
        <div className="flex rounded-xl bg-white/5 border border-white/10 p-1">
          {([['all', 'All'], ['approved', 'Approved'], ['pending', 'Hidden']] as const).map(([v, label]) => (
            <button
              key={v}
              onClick={() => setFilter(v)}
              aria-pressed={filter === v}
              className={`px-4 h-9 rounded-lg text-xs font-medium transition-colors ${filter === v ? 'bg-primary text-white' : 'text-neutral-400 hover:text-white'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {loading && <p className="text-sm text-neutral-500 py-8 text-center">Loading reviews…</p>}
        {!loading && reviews.length === 0 && (
          <p className="text-sm text-neutral-500 py-12 text-center rounded-2xl border border-dashed border-white/10">No reviews in this view.</p>
        )}
        {reviews.map((r) => (
          <article key={r.id} className="rounded-2xl bg-card border border-white/5 p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3 min-w-0">
                { }
                <img src={r.product.image || '/images/placeholder.png'} alt="" className="w-11 h-11 rounded-xl object-cover bg-white/5" loading="lazy" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{r.product.name}</p>
                  <p className="text-xs text-neutral-500">{r.user.name} · {new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-500/10 px-2 py-1 text-xs font-bold text-amber-400">
                  <Star className="w-3 h-3 fill-current" /> {r.rating}
                </span>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${r.isApproved ? 'bg-green-500/15 text-green-400' : 'bg-white/10 text-neutral-400'}`}>
                  {r.isApproved ? 'Live' : 'Hidden'}
                </span>
                <Button size="icon" variant="ghost" onClick={() => setApproved(r, !r.isApproved)} aria-label={r.isApproved ? `Hide review` : `Approve review`} className="text-neutral-400 hover:text-green-400">
                  {r.isApproved ? <EyeOffIcon /> : <Check className="w-4 h-4" />}
                </Button>
                <Button size="icon" variant="ghost" onClick={() => remove(r)} aria-label="Delete review" className="text-neutral-600 hover:text-red-400">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="mt-3">
              {r.title && <p className="text-sm font-semibold">{r.title}</p>}
              <p className="text-sm text-neutral-400 leading-relaxed mt-1">{r.comment}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

function EyeOffIcon() {
  return (
    <span className="flex items-center gap-1">
      <X className="w-3.5 h-3.5" />
    </span>
  )
}

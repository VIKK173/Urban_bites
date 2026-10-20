'use client'

import { useEffect, useMemo, useState } from 'react'
import { Minus, Plus, ShoppingBag, Star, ChevronLeft, MessageSquarePlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { VegBadge, RatingStars } from '@/components/urb/FoodCard'
import { get, post } from '@/services/api'
import { navigate } from '@/hooks/useHashRoute'
import { useAuthStore } from '@/store/auth-store'
import { useCartStore } from '@/store/cart-store'
import { formatINR } from '@/lib/money'
import { toast } from 'sonner'

interface OptionChoice {
  label: string
  price: number
}
interface OptionGroup {
  group: string
  required: boolean
  multi: boolean
  choices: OptionChoice[]
}

interface ProductDetail {
  id: string
  name: string
  slug: string
  description: string
  price: number
  comparePrice: number | null
  discountPercent: number
  image: string | null
  isVeg: boolean
  spiceLevel: number
  ingredients: string[]
  allergens: string[]
  options: OptionGroup[]
  rating: number
  ratingCount: number
  isAvailable: boolean
  isFeatured: boolean
  soldCount: number
  category: { name: string; slug: string }
}

interface ReviewItem {
  id: string
  rating: number
  title: string | null
  comment: string
  userName: string
  createdAt: string
}

export default function ProductPage({ slugOrId }: { slugOrId: string }) {
  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [reviews, setReviews] = useState<ReviewItem[]>([])
  const [loading, setLoading] = useState(true)
  const [qty, setQty] = useState(1)
  const [selected, setSelected] = useState<Record<string, string[]>>({})
  const [adding, setAdding] = useState(false)
  const user = useAuthStore((s) => s.user)
  const addItem = useCartStore((s) => s.addItem)

  const [showReviewForm, setShowReviewForm] = useState(false)
  const [revRating, setRevRating] = useState(5)
  const [revTitle, setRevTitle] = useState('')
  const [revComment, setRevComment] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)

  useEffect(() => {
    setLoading(true)
    get<{ product: ProductDetail; reviews: ReviewItem[] }>(`/api/products/${encodeURIComponent(slugOrId)}`)
      .then((d) => {
        setProduct(d.product)
        setReviews(d.reviews)
        // preselect required single-choice groups
        const pre: Record<string, string[]> = {}
        for (const g of d.product.options) {
          if (g.required && !g.multi && g.choices[0]) pre[g.group] = [g.choices[0].label]
        }
        setSelected(pre)
      })
      .catch(() => setProduct(null))
      .finally(() => setLoading(false))
  }, [slugOrId])

  const chosenLabels = useMemo(() => Object.values(selected).flat(), [selected])

  const optionsExtra = useMemo(() => {
    if (!product) return 0
    return product.options
      .flatMap((g) => g.choices.filter((c) => chosenLabels.includes(c.label)))
      .reduce((s, c) => s + c.price, 0)
  }, [product, chosenLabels])

  const unitPrice = (product?.price ?? 0) + optionsExtra

  const canSubmitOptions = useMemo(() => {
    if (!product) return false
    return product.options
      .filter((g) => g.required && !g.multi)
      .every((g) => (selected[g.group] || []).length > 0)
  }, [product, selected])

  const toggleChoice = (groupName: string, label: string, multi: boolean) => {
    setSelected((prev) => {
      const current = prev[groupName] || []
      if (multi) {
        return { ...prev, [groupName]: current.includes(label) ? current.filter((l) => l !== label) : [...current, label] }
      }
      return { ...prev, [groupName]: current.includes(label) ? [] : [label] }
    })
  }

  const handleAdd = async () => {
    if (!user) {
      toast.info('Log in to start your order')
      navigate('/login')
      return
    }
    if (!product || !canSubmitOptions) return
    setAdding(true)
    try {
      await addItem(product.id, qty, chosenLabels)
      toast.success(`${qty} × ${product.name} added to cart`)
      navigate('/cart')
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setAdding(false)
    }
  }

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!product) return
    setSubmittingReview(true)
    try {
      await post(`/api/products/${product.id}/reviews`, { rating: revRating, title: revTitle, comment: revComment })
      toast.success('Review posted — thank you!')
      setShowReviewForm(false)
      setRevTitle('')
      setRevComment('')
      const d = await get<{ product: ProductDetail; reviews: ReviewItem[] }>(`/api/products/${product.id}`)
      setProduct(d.product)
      setReviews(d.reviews)
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSubmittingReview(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12 grid lg:grid-cols-2 gap-10">
        <Skeleton className="aspect-square rounded-3xl bg-white/5" />
        <div className="space-y-4">
          <Skeleton className="h-10 w-3/4 bg-white/5" />
          <Skeleton className="h-5 w-1/3 bg-white/5" />
          <Skeleton className="h-20 w-full bg-white/5" />
          <Skeleton className="h-32 w-full bg-white/5" />
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="font-display text-3xl font-bold">Dish not found</h1>
        <p className="mt-3 text-neutral-500">It may have been removed from the menu. Browse what&apos;s cooking right now.</p>
        <Button onClick={() => navigate('/menu')} className="mt-6 rounded-full bg-primary text-white">Back to menu</Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-12">
      <button onClick={() => history.back()} className="flex items-center gap-1 text-sm text-neutral-400 hover:text-white transition-colors">
        <ChevronLeft className="w-4 h-4" /> Back
      </button>

      <div className="mt-6 grid lg:grid-cols-2 gap-8 lg:gap-12">
        {/* image */}
        <div className="relative">
          <div className="relative aspect-square overflow-hidden rounded-3xl border border-white/5 bg-[#141414]">
            { }
            <img
              src={product.image || '/images/placeholder.png'}
              alt={product.name}
              className="w-full h-full object-cover"
            />
            {product.discountPercent > 0 && (
              <span className="absolute top-4 left-4 rounded-full bg-primary px-3 py-1.5 text-sm font-bold text-white">{product.discountPercent}% OFF</span>
            )}
            {!product.isAvailable && (
              <div className="absolute inset-0 grid place-items-center bg-black/65">
                <span className="rounded-full border border-white/15 bg-black/80 px-5 py-2 text-sm font-semibold">Unavailable right now</span>
              </div>
            )}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-card border border-white/5 p-3">
              <p className="text-lg font-bold">{product.soldCount}</p>
              <p className="text-[11px] text-neutral-500">sold this month</p>
            </div>
            <div className="rounded-xl bg-card border border-white/5 p-3">
              <p className="text-lg font-bold flex items-center justify-center gap-1"><Star className="w-4 h-4 fill-amber-400 text-amber-400" /> {product.rating.toFixed(1)}</p>
              <p className="text-[11px] text-neutral-500">{product.ratingCount} ratings</p>
            </div>
            <div className="rounded-xl bg-card border border-white/5 p-3">
              <p className="text-lg font-bold">{product.category.name}</p>
              <p className="text-[11px] text-neutral-500">category</p>
            </div>
          </div>
        </div>

        {/* details */}
        <div>
          <div className="flex items-center gap-2">
            <VegBadge isVeg={product.isVeg} />
            <span className="text-xs text-neutral-500 uppercase tracking-widest">{product.category.name}</span>
          </div>
          <h1 className="font-display mt-3 text-4xl sm:text-5xl font-bold leading-tight">{product.name}</h1>
          <p className="mt-4 text-neutral-400 leading-relaxed">{product.description}</p>

          <div className="mt-5 flex items-baseline gap-3">
            <span className="text-3xl font-bold">{formatINR(unitPrice)}</span>
            {product.comparePrice && product.comparePrice > product.price && (
              <span className="text-neutral-600 line-through">{formatINR(product.comparePrice)}</span>
            )}
          </div>

          {/* customization */}
          {product.options.length > 0 && (
            <div className="mt-7 space-y-6">
              {product.options.map((g) => (
                <fieldset key={g.group} className="rounded-2xl border border-white/10 p-4">
                  <legend className="px-2 text-sm font-semibold">
                    {g.group}
                    <span className="ml-2 text-[11px] font-normal text-neutral-500">{g.multi ? 'choose any' : g.required ? 'required' : 'optional'}</span>
                  </legend>
                  <div className="mt-2 grid sm:grid-cols-2 gap-2">
                    {g.choices.map((c) => {
                      const active = (selected[g.group] || []).includes(c.label)
                      return (
                        <button
                          key={c.label}
                          type="button"
                          role={g.multi ? 'checkbox' : 'radio'}
                          aria-checked={active}
                          onClick={() => toggleChoice(g.group, c.label, g.multi)}
                          className={`flex items-center justify-between rounded-xl border px-3.5 py-3 text-sm transition-all ${
                            active ? 'border-primary bg-primary/10 text-white' : 'border-white/10 text-neutral-300 hover:border-white/25'
                          }`}
                        >
                          <span>{c.label}</span>
                          <span className={active ? 'text-primary font-semibold' : 'text-neutral-500'}>
                            {c.price > 0 ? `+${formatINR(c.price)}` : 'Free'}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </fieldset>
              ))}
            </div>
          )}

          {/* qty + add */}
          <div className="mt-7 flex items-center gap-3">
            <div className="flex items-center rounded-full border border-white/15" role="group" aria-label="Quantity">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease quantity" className="w-11 h-11 grid place-items-center text-neutral-300 hover:text-white disabled:opacity-40" disabled={qty <= 1}>
                <Minus className="w-4 h-4" />
              </button>
              <span aria-live="polite" className="w-8 text-center font-bold">{qty}</span>
              <button onClick={() => setQty((q) => Math.min(10, q + 1))} aria-label="Increase quantity" className="w-11 h-11 grid place-items-center text-neutral-300 hover:text-white disabled:opacity-40" disabled={qty >= 10}>
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <Button
              size="lg"
              onClick={handleAdd}
              disabled={!product.isAvailable || adding || !canSubmitOptions}
              className="flex-1 h-12 rounded-full bg-primary hover:bg-primary/90 font-bold"
            >
              <ShoppingBag className="w-4 h-4 mr-2" />
              {product.isAvailable ? `Add to Cart · ${formatINR(unitPrice * qty)}` : 'Unavailable'}
            </Button>
          </div>
          {!canSubmitOptions && (
            <p className="mt-2 text-xs text-amber-400">Choose the required options above to continue.</p>
          )}

          {/* ingredients & allergens */}
          <div className="mt-8 grid sm:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-card border border-white/5 p-4">
              <h2 className="text-sm font-semibold text-white">Ingredients</h2>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {product.ingredients.map((i) => (
                  <span key={i} className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-neutral-300">{i}</span>
                ))}
              </div>
            </div>
            <div className="rounded-2xl bg-card border border-white/5 p-4">
              <h2 className="text-sm font-semibold text-white">Allergens</h2>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {product.allergens.length === 0 ? (
                  <span className="text-[11px] text-neutral-500">No common allergens</span>
                ) : (
                  product.allergens.map((a) => (
                    <span key={a} className="rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-300">{a}</span>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* reviews */}
      <section className="mt-14" aria-labelledby="product-reviews-heading">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 id="product-reviews-heading" className="font-display text-2xl font-bold">
            Reviews <span className="text-neutral-600 text-lg">({reviews.length})</span>
          </h2>
          {user && (
            <Button variant="outline" onClick={() => setShowReviewForm((v) => !v)} className="rounded-full border-white/15 text-white">
              <MessageSquarePlus className="w-4 h-4 mr-1" /> Write a review
            </Button>
          )}
        </div>

        {showReviewForm && user && (
          <form onSubmit={submitReview} className="mt-5 rounded-2xl bg-card border border-white/10 p-5 space-y-4 max-w-2xl">
            <div>
              <Label className="text-neutral-300">Your rating</Label>
              <div className="mt-1 flex gap-1" role="radiogroup" aria-label="Rating">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={revRating === n}
                    aria-label={`${n} star${n > 1 ? 's' : ''}`}
                    onClick={() => setRevRating(n)}
                    className="p-0.5"
                  >
                    <Star className={`w-6 h-6 transition-colors ${n <= revRating ? 'fill-amber-400 text-amber-400' : 'text-neutral-700 hover:text-neutral-500'}`} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="review-title" className="text-neutral-300">Title (optional)</Label>
              <Input id="review-title" value={revTitle} onChange={(e) => setRevTitle(e.target.value)} maxLength={80} className="mt-1 bg-white/5 border-white/10 text-white" placeholder="Absolutely fire!" />
            </div>
            <div>
              <Label htmlFor="review-comment" className="text-neutral-300">Your review</Label>
              <Textarea id="review-comment" required minLength={5} maxLength={1000} value={revComment} onChange={(e) => setRevComment(e.target.value)} className="mt-1 bg-white/5 border-white/10 text-white min-h-24" placeholder="What did you love? What could be better?" />
            </div>
            <Button type="submit" disabled={submittingReview} className="rounded-full bg-primary text-white">
              {submittingReview ? 'Posting…' : 'Post review'}
            </Button>
            <p className="text-[11px] text-neutral-600">Only customers with a delivered order containing this item can review it.</p>
          </form>
        )}

        <div className="mt-6 grid md:grid-cols-2 gap-4">
          {reviews.length === 0 && (
            <p className="text-sm text-neutral-500 md:col-span-2 py-6 text-center">No reviews yet — ordered this before? Tell everyone how it was.</p>
          )}
          {reviews.map((r) => (
            <article key={r.id} className="rounded-2xl bg-card border border-white/5 p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 grid place-items-center rounded-full bg-primary/15 text-primary text-xs font-bold">{r.userName.charAt(0)}</span>
                  <div>
                    <p className="text-sm font-medium text-white">{r.userName}</p>
                    <p className="text-[11px] text-neutral-500">{new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                </div>
                <RatingStars rating={r.rating} />
              </div>
              {r.title && <h3 className="mt-3 text-sm font-semibold text-white">{r.title}</h3>}
              <p className="mt-1.5 text-sm text-neutral-400 leading-relaxed">{r.comment}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import {
  ArrowRight, ChefHat, Clock, Leaf, ShieldCheck, Star, Truck, Flame,
  ChevronRight, Quote, BadgeCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import FoodCard, { type FoodCardProduct } from '@/components/urb/FoodCard'
import { get, post } from '@/services/api'
import { navigate } from '@/hooks/useHashRoute'
import { toast } from 'sonner'
import { formatINR } from '@/lib/money'

interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  image: string | null
  productCount: number
}

interface Settings {
  offer: { title: string; text: string; code: string; discount: number; active: boolean }
  contact: { openHours: string }
  etaMinutes: number
  deliveryFee: number
}

interface LatestReview {
  id: string
  rating: number
  title: string | null
  comment: string
  userName: string
  createdAt: string
  product: { name: string; slug: string; image: string | null }
}

const INGREDIENTS = [
  { src: '/images/ing-tomato.svg', className: 'w-[24%] top-[-2%] left-[-4%]', depth: -26, delay: 0, dur: 6.5 },
  { src: '/images/ing-onion.svg', className: 'w-[21%] top-[2%] right-[-5%]', depth: 20, delay: 0.8, dur: 7.5 },
  { src: '/images/ing-cheese.svg', className: 'w-[26%] bottom-[6%] left-[-8%]', depth: 17, delay: 1.6, dur: 6 },
  { src: '/images/ing-chili.svg', className: 'w-[19%] bottom-[-2%] right-[-2%]', depth: -18, delay: 0.4, dur: 8 },
  { src: '/images/ing-lettuce.svg', className: 'w-[22%] top-[42%] left-[-10%]', depth: 22, delay: 1.1, dur: 7 },
  { src: '/images/ing-sauce.svg', className: 'w-[20%] top-[38%] right-[-9%]', depth: -20, delay: 2, dur: 6.8 },
]

export default function HomePage() {
  const [categories, setCategories] = useState<Category[] | null>(null)
  const [bestSellers, setBestSellers] = useState<FoodCardProduct[] | null>(null)
  const [reviews, setReviews] = useState<LatestReview[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [email, setEmail] = useState('')
  const [subscribing, setSubscribing] = useState(false)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    get<{ categories: Category[] }>('/api/categories').then((d) => setCategories(d.categories)).catch(() => setCategories([]))
    get<{ products: FoodCardProduct[] }>('/api/products?featured=true&limit=8&available=true&sort=popular')
      .then((d) => setBestSellers(d.products))
      .catch(() => setBestSellers([]))
    get<{ reviews: LatestReview[] }>('/api/reviews/latest?limit=6').then((d) => setReviews(d.reviews)).catch(() => {})
    get<{ settings: Settings }>('/api/settings').then((d) => setSettings(d.settings)).catch(() => {})
  }, [])

  const subscribe = async (e: React.FormEvent) => {
    e.preventDefault()
    if (subscribing) return
    setSubscribing(true)
    try {
      const res = await post<{ message: string }>('/api/newsletter', { email })
      toast.success(res.message)
      setEmail('')
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSubscribing(false)
    }
  }

  return (
    <div className="overflow-x-clip">
      <HeroSection reduceMotion={reduceMotion} settings={settings} />

      {/* ---------------- categories ---------------- */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-20" aria-labelledby="categories-heading">
        <SectionHeading
          id="categories-heading"
          kicker="Browse by craving"
          title="WHAT'S YOUR MOOD?"
          sub="Eight kitchens, one obsession — flavour."
        />
        <div className="mt-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
          {(categories ?? Array.from({ length: 8 })).map((c, i) =>
            c ? (
              <CategoryCard key={c.id} category={c} index={i} />
            ) : (
              <Skeleton key={i} className="aspect-[5/4] rounded-2xl bg-white/5" />
            ),
          )}
        </div>
      </section>

      {/* ---------------- best sellers ---------------- */}
      <section className="bg-[#0d0d0d] border-y border-white/5 py-16 sm:py-20" aria-labelledby="bestsellers-heading">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <SectionHeading id="bestsellers-heading" kicker="Loved by thousands" title="BEST SELLERS" sub="The heavy hitters our regulars keep re-ordering." />
            <Link href="#/menu" className="group flex items-center gap-1 text-sm font-semibold text-primary hover:gap-2 transition-all">
              View full menu <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {(bestSellers ?? Array.from({ length: 8 })).map((p, i) =>
              p ? (
                <FoodCard key={p.id} product={p} index={i} />
              ) : (
                <div key={i} className="rounded-2xl bg-card border border-white/5 overflow-hidden">
                  <Skeleton className="aspect-[4/3] bg-white/5 rounded-none" />
                  <div className="p-4 space-y-3">
                    <Skeleton className="h-4 w-3/4 bg-white/5" />
                    <Skeleton className="h-3 w-1/2 bg-white/5" />
                    <Skeleton className="h-8 w-full bg-white/5" />
                  </div>
                </div>
              ),
            )}
          </div>
        </div>
      </section>

      {/* ---------------- special offer ---------------- */}
      {settings?.offer.active && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-20" aria-labelledby="offer-heading">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#e01e37] via-[#ff354d] to-[#ff5f6d] shadow-[0_24px_80px_-24px_rgba(255,53,77,0.5)]"
          >
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_80%_20%,rgba(0,0,0,0.45),transparent_55%)]" aria-hidden />
            <div className="relative grid lg:grid-cols-2 gap-6 items-center">
              <div className="p-8 sm:p-12 text-white">
                <span className="inline-flex items-center gap-2 rounded-full bg-black/25 px-3 py-1 text-xs font-bold uppercase tracking-widest">
                  <Flame className="w-3.5 h-3.5" aria-hidden /> Limited time
                </span>
                <h2 id="offer-heading" className="font-display mt-4 text-4xl sm:text-5xl font-bold leading-[1.02]">
                  {settings.offer.title}
                </h2>
                <p className="mt-3 text-white/90 max-w-md leading-relaxed">{settings.offer.text}</p>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <div className="rounded-xl border-2 border-dashed border-white/60 bg-black/20 px-4 py-2.5">
                    <span className="block text-[10px] uppercase tracking-widest text-white/70">Coupon code</span>
                    <span className="font-display text-xl font-bold tracking-wider">{settings.offer.code}</span>
                  </div>
                  <Button onClick={() => navigate('/menu')} size="lg" className="rounded-full bg-black text-white hover:bg-black/85 font-semibold h-12 px-7">
                    Order & Save <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="relative h-56 sm:h-72 lg:h-80 lg:self-stretch">
                { }
                <img
                  src="/images/offer-banner.png"
                  alt="Blazing burger with flying fries"
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover object-center lg:[clip-path:polygon(18%_0,100%_0,100%_100%,0_100%)]"
                />
              </div>
            </div>
          </motion.div>
        </section>
      )}

      {/* ---------------- why choose us ---------------- */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 pb-16 sm:pb-24" aria-labelledby="why-heading">
        <SectionHeading id="why-heading" kicker="The Urban promise" title="WHY URBAN BITES?" sub="Four reasons your taste buds keep coming back." />
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { icon: Leaf, title: 'Fresh Ingredients', text: 'Produce delivered every morning, breads baked in-house, sauces made from scratch daily. Nothing frozen, ever.' },
            { icon: Truck, title: 'Lightning Delivery', text: `Hot food at your door in ~${settings?.etaMinutes ?? 35} minutes across the city, tracked live from the fryer to your gate.` },
            { icon: ShieldCheck, title: 'Secure Payments', text: 'Pay by UPI, cards or cash. Every online payment is verified server-side before your order even hits the kitchen.' },
            { icon: ChefHat, title: 'Quality Guarantee', text: 'Not loving your order? Our remake-or-refund promise has you covered — no long forms, no interrogation.' },
          ].map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="group rounded-2xl bg-card border border-white/5 p-6 hover:border-primary/30 transition-colors"
            >
              <span className="grid place-items-center w-12 h-12 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                <f.icon className="w-6 h-6" aria-hidden />
              </span>
              <h3 className="mt-4 font-display text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-neutral-400 leading-relaxed">{f.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ---------------- reviews ---------------- */}
      <section className="bg-[#0d0d0d] border-y border-white/5 py-16 sm:py-20" aria-labelledby="reviews-heading">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeading id="reviews-heading" kicker="Straight from the group chat" title="CUSTOMER LOVE" sub="Verified reviews from delivered orders." />
          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {reviews.length === 0 && (
              <p className="text-sm text-neutral-500 col-span-full text-center py-8">Be the first to review after your next order!</p>
            )}
            {reviews.map((r, i) => (
              <motion.figure
                key={r.id}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: Math.min(i * 0.06, 0.3) }}
                className="rounded-2xl bg-card border border-white/5 p-6 flex flex-col gap-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex gap-0.5" aria-label={`${r.rating} out of 5 stars`}>
                    {Array.from({ length: 5 }).map((_, s) => (
                      <Star key={s} className={`w-4 h-4 ${s < r.rating ? 'fill-amber-400 text-amber-400' : 'text-neutral-700'}`} />
                    ))}
                  </div>
                  <Quote className="w-5 h-5 text-white/10" aria-hidden />
                </div>
                <blockquote className="text-sm text-neutral-300 leading-relaxed flex-1">
                  {r.title && <span className="block font-semibold text-white mb-1">{r.title}</span>}
                  “{r.comment}”
                </blockquote>
                <figcaption className="flex items-center gap-3 pt-2 border-t border-white/5">
                  <span className="w-8 h-8 grid place-items-center rounded-full bg-primary/15 text-primary text-xs font-bold">
                    {r.userName.charAt(0)}
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-1 text-sm font-medium text-white">
                      {r.userName} <BadgeCheck className="w-3.5 h-3.5 text-green-500" aria-label="Verified order" />
                    </span>
                    <span className="block text-xs text-neutral-500 truncate">
                      on <Link href={`#/product/${r.product.slug}`} className="hover:text-primary">{r.product.name}</Link>
                    </span>
                  </span>
                </figcaption>
              </motion.figure>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- newsletter ---------------- */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-24" aria-labelledby="newsletter-heading">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#111] px-6 sm:px-12 py-12 text-center">
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-primary/20 blur-[120px] rounded-full" aria-hidden />
          <div className="relative max-w-xl mx-auto">
            <Flame className="mx-auto w-8 h-8 text-primary" aria-hidden />
            <h2 id="newsletter-heading" className="font-display mt-4 text-3xl sm:text-4xl font-bold">JOIN THE FLAVOUR LIST</h2>
            <p className="mt-3 text-sm text-neutral-400 leading-relaxed">
              Secret menu drops, flash deals and a free dessert on your birthday. One email a week, zero spam, unsubscribe anytime.
            </p>
            <form onSubmit={subscribe} className="mt-6 flex flex-col sm:flex-row gap-3" noValidate={false}>
              <label htmlFor="newsletter-email" className="sr-only">Email address</label>
              <Input
                id="newsletter-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="flex-1 h-12 rounded-full bg-white/5 border-white/10 text-white placeholder:text-neutral-600"
              />
              <Button type="submit" disabled={subscribing} className="h-12 rounded-full bg-primary hover:bg-primary/90 font-semibold px-8">
                {subscribing ? 'Joining…' : 'Subscribe'}
              </Button>
            </form>
          </div>
        </div>
      </section>
    </div>
  )
}

/* ============================================================ */

function HeroSection({ reduceMotion, settings }: { reduceMotion: boolean | null; settings: Settings | null }) {
  const float = (depth: number, delay: number, dur: number) =>
    reduceMotion
      ? { initial: { opacity: 0, scale: 0.6 }, animate: { opacity: 1, scale: 1 } }
      : {
          initial: { opacity: 0, scale: 0.6 },
          animate: { opacity: 1, scale: 1, y: [0, depth, 0], rotate: [0, depth / 2, 0] },
          transition: { opacity: { delay: 0.6 + delay * 0.3, duration: 0.6 }, scale: { delay: 0.6 + delay * 0.3, duration: 0.6 }, y: { duration: dur, repeat: Infinity, ease: 'easeInOut' as const, delay }, rotate: { duration: dur, repeat: Infinity, ease: 'easeInOut' as const, delay } },
        }

  return (
    <section className="relative min-h-[92vh] flex items-center overflow-hidden" aria-label="Urban Bites hero">
      {/* giant outline typography */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none" aria-hidden>
        <motion.span
          initial={{ opacity: 0, scale: 1.15 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          className="font-display text-outline font-bold uppercase leading-none text-[18vw] whitespace-nowrap"
        >
          PUSH THE TASTE
        </motion.span>
      </div>
      <div className="absolute -top-40 -left-40 w-[560px] h-[560px] bg-primary/15 blur-[160px] rounded-full" aria-hidden />
      <div className="absolute -bottom-40 -right-40 w-[560px] h-[560px] bg-[#ff5f00]/10 blur-[160px] rounded-full" aria-hidden />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 w-full grid lg:grid-cols-2 gap-10 items-center pt-10 pb-20">
        {/* copy */}
        <div className="order-2 lg:order-1 text-center lg:text-left">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-primary"
          >
            <Flame className="w-3.5 h-3.5" aria-hidden /> Mumbai's boldest kitchen
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="font-display mt-5 text-5xl sm:text-6xl lg:text-7xl font-bold leading-[0.98]"
          >
            CRAVINGS?
            <br />
            <span className="text-primary">WE GOT YOU.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-5 text-lg text-neutral-400 max-w-md mx-auto lg:mx-0 leading-relaxed"
          >
            Bold flavors. Fresh ingredients. Delivered to your door.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.55 }}
            className="mt-8 flex flex-wrap items-center justify-center lg:justify-start gap-3"
          >
            <Button size="lg" onClick={() => navigate('/menu')} className="h-13 rounded-full bg-primary hover:bg-primary/90 text-white font-bold px-8 h-12 glow-red">
              Explore Menu <ArrowRight className="w-4 h-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate('/menu?sort=popular')}
              className="h-12 rounded-full border-white/20 text-white hover:bg-white/10 hover:text-white font-semibold px-8"
            >
              Order Now
            </Button>
          </motion.div>

          {/* trust indicators */}
          <motion.dl
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="mt-10 flex flex-wrap justify-center lg:justify-start gap-x-8 gap-y-4"
          >
            {[
              { icon: Clock, value: `${settings?.etaMinutes ?? 35} min`, label: 'Avg. delivery' },
              { icon: Leaf, value: '100% fresh', label: 'Daily ingredients' },
              { icon: Star, value: '4.8 / 5', label: '12k+ ratings' },
            ].map((t) => (
              <div key={t.label} className="flex items-center gap-2.5">
                <span className="grid place-items-center w-9 h-9 rounded-full bg-white/5 text-primary">
                  <t.icon className="w-4 h-4" aria-hidden />
                </span>
                <span>
                  <dd className="block text-sm font-bold text-white leading-none">{t.value}</dd>
                  <dt className="block text-[11px] text-neutral-500 mt-1">{t.label}</dt>
                </span>
              </div>
            ))}
          </motion.dl>
        </div>

        {/* burger + floating ingredients */}
        <div className="order-1 lg:order-2 relative mx-auto w-full max-w-[520px] aspect-square" aria-hidden={false}>
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
            className="absolute inset-0 grid place-items-center"
          >
            <motion.div
              {...(reduceMotion ? {} : { animate: { y: [0, -14, 0] }, transition: { duration: 5.5, repeat: Infinity, ease: 'easeInOut' } })}
              className="relative w-[86%] aspect-square"
            >
              <div className="absolute inset-0 rounded-full bg-primary/25 blur-[90px]" aria-hidden />
              { }
              <img
                src="/images/hero-burger.png"
                alt="Urban Bites signature double cheeseburger with floating fresh ingredients"
                className="relative w-full h-full object-cover rounded-[2.5rem] md:rounded-full [mask-image:radial-gradient(circle_at_center,black_58%,transparent_74%)] drop-shadow-[0_40px_60px_rgba(0,0,0,0.6)]"
                fetchPriority="high"
              />
            </motion.div>
          </motion.div>

          {/* floating ingredient layers */}
          {INGREDIENTS.map((ing) => (
            <motion.img
              key={ing.src}
              src={ing.src}
              alt=""
              aria-hidden
              className={`absolute ${ing.className} object-contain drop-shadow-[0_14px_28px_rgba(0,0,0,0.65)] pointer-events-none`}
              {...float(ing.depth, ing.delay, ing.dur)}
            />
          ))}
        </div>
      </div>

      {/* bottom fade */}
      <div className="absolute bottom-0 inset-x-0 h-28 bg-gradient-to-t from-background to-transparent" aria-hidden />
    </section>
  )
}

function SectionHeading({ id, kicker, title, sub }: { id: string; kicker: string; title: string; sub: string }) {
  return (
    <div className="max-w-xl">
      <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary">{kicker}</p>
      <h2 id={id} className="font-display mt-2 text-3xl sm:text-4xl font-bold">{title}</h2>
      <p className="mt-2 text-sm text-neutral-500">{sub}</p>
    </div>
  )
}

function CategoryCard({ category, index }: { category: Category; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.05, 0.35) }}
    >
      <Link
        href={`#/menu?category=${category.slug}`}
        className="group relative block aspect-[5/4] overflow-hidden rounded-2xl border border-white/5"
        aria-label={`${category.name} — ${category.productCount} items`}
      >
        { }
        <img
          src={category.image || '/images/placeholder.png'}
          alt={category.name}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" aria-hidden />
        <div className="absolute inset-x-0 bottom-0 p-4">
          <h3 className="font-display text-lg font-semibold text-white group-hover:text-primary transition-colors">{category.name}</h3>
          <p className="text-[11px] text-neutral-400">{category.productCount} items →</p>
        </div>
      </Link>
    </motion.div>
  )
}

'use client'

import Link from 'next/link'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Heart, Plus, Star, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCartStore } from '@/store/cart-store'
import { useAuthStore } from '@/store/auth-store'
import { navigate } from '@/hooks/useHashRoute'
import { formatINR } from '@/lib/money'
import { toast } from 'sonner'

export interface FoodCardProduct {
  id: string
  name: string
  slug: string
  description?: string
  image: string | null
  price: number
  comparePrice: number | null
  discountPercent: number
  isVeg: boolean
  rating: number
  ratingCount: number
  isAvailable: boolean
  category?: { name: string; slug: string }
  soldCount?: number
}

export function VegBadge({ isVeg, className = '' }: { isVeg: boolean; className?: string }) {
  return (
    <span
      title={isVeg ? 'Vegetarian' : 'Non-vegetarian'}
      aria-label={isVeg ? 'Vegetarian' : 'Non-vegetarian'}
      className={`inline-grid place-items-center w-4 h-4 rounded-[3px] border ${isVeg ? 'border-green-500' : 'border-red-500'} ${className}`}
    >
      <span className={`w-2 h-2 rounded-full ${isVeg ? 'bg-green-500' : 'bg-red-500'}`} />
    </span>
  )
}

export function RatingStars({ rating, count, className = '' }: { rating: number; count?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <span className="inline-flex items-center gap-0.5 rounded-md bg-green-500/15 px-1.5 py-0.5 text-xs font-bold text-green-500">
        <Star className="w-3 h-3 fill-current" aria-hidden /> {rating.toFixed(1)}
      </span>
      {count !== undefined && <span className="text-xs text-neutral-500">({count})</span>}
    </span>
  )
}

export function SpiceLevel({ level }: { level: number }) {
  if (level <= 0) return null
  return (
    <span className="inline-flex" aria-label={`Spice level ${level} of 3`} title={`Spice level ${level}/3`}>
      {Array.from({ length: 3 }).map((_, i) => (
        <span key={i} className={`text-[10px] ${i < level ? 'opacity-100' : 'opacity-20'}`}>🌶️</span>
      ))}
    </span>
  )
}

export default function FoodCard({
  product,
  index = 0,
  favorited = false,
  onToggleFavorite,
}: {
  product: FoodCardProduct
  index?: number
  favorited?: boolean
  onToggleFavorite?: (productId: string) => void
}) {
  const addItem = useCartStore((s) => s.addItem)
  const user = useAuthStore((s) => s.user)
  const [adding, setAdding] = useState(false)
  const [fav, setFav] = useState(favorited)

  const handleAdd = async () => {
    if (!user) {
      toast.info('Log in to start your order', { description: 'It takes 20 seconds — your cart is waiting.' })
      navigate('/login')
      return
    }
    if (!product.isAvailable) return
    setAdding(true)
    try {
      await addItem(product.id)
      toast.success(`${product.name} added to cart`)
    } catch (e) {
      toast.error((e as Error).message || 'Could not add to cart')
    } finally {
      setAdding(false)
    }
  }

  const handleFav = async () => {
    if (!user) {
      toast.info('Log in to save favorites')
      navigate('/login')
      return
    }
    if (!onToggleFavorite) return
    setFav((v) => !v)
    onToggleFavorite(product.id)
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.05, 0.3) }}
      className={`group relative flex flex-col rounded-2xl bg-card border border-white/5 overflow-hidden transition-all duration-300 hover:border-primary/40 hover:shadow-[0_12px_40px_-12px_rgba(255,53,77,0.25)] hover:-translate-y-1 ${
        !product.isAvailable ? 'opacity-70' : ''
      }`}
    >
      {/* image */}
      <Link href={`#/product/${product.slug}`} className="relative block aspect-[4/3] overflow-hidden bg-[#1a1a1a]">
        { }
        <img
          src={product.image || '/images/placeholder.png'}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {product.discountPercent > 0 && (
          <span className="absolute top-3 left-3 rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold text-white shadow-lg">
            {product.discountPercent}% OFF
          </span>
        )}
        {!product.isAvailable && (
          <span className="absolute inset-0 grid place-items-center bg-black/60">
            <span className="rounded-full bg-black/80 border border-white/15 px-4 py-1.5 text-xs font-semibold text-neutral-300">
              Sold out today
            </span>
          </span>
        )}
      </Link>

      {/* favorite */}
      {onToggleFavorite && (
        <button
          onClick={handleFav}
          aria-label={fav ? `Remove ${product.name} from favorites` : `Add ${product.name} to favorites`}
          aria-pressed={fav}
          className="absolute top-3 right-3 z-10 w-8 h-8 grid place-items-center rounded-full bg-black/50 backdrop-blur border border-white/10 text-white transition-transform hover:scale-110"
        >
          <Heart className={`w-4 h-4 transition-colors ${fav ? 'fill-primary text-primary' : ''}`} />
        </button>
      )}

      {/* body */}
      <div className="flex flex-col gap-2 p-4 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <VegBadge isVeg={product.isVeg} />
            <h3 className="font-semibold text-[15px] leading-tight text-white truncate">
              <Link href={`#/product/${product.slug}`} className="hover:text-primary transition-colors">{product.name}</Link>
            </h3>
          </div>
          <RatingStars rating={product.rating} />
        </div>

        {product.description && (
          <p className="text-xs text-neutral-500 leading-relaxed line-clamp-2 flex-1">{product.description}</p>
        )}

        <div className="mt-1 flex items-center justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-white">{formatINR(product.price)}</span>
            {product.comparePrice && product.comparePrice > product.price && (
              <span className="text-xs text-neutral-500 line-through">{formatINR(product.comparePrice)}</span>
            )}
          </div>
          <Button
            size="sm"
            onClick={handleAdd}
            disabled={!product.isAvailable || adding}
            className={`rounded-full h-9 px-4 font-semibold ${product.isAvailable ? 'bg-primary hover:bg-primary/90 text-white' : 'bg-white/10 text-neutral-500'}`}
            aria-label={`Add ${product.name} to cart`}
          >
            {adding ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Plus className="w-4 h-4 mr-0.5" /> Add
              </>
            )}
          </Button>
        </div>

        {product.soldCount !== undefined && product.soldCount > 200 && (
          <p className="flex items-center gap-1 text-[11px] text-neutral-600">
            <Clock className="w-3 h-3" /> {product.soldCount}+ sold · bestseller this week
          </p>
        )}
      </div>
    </motion.article>
  )
}

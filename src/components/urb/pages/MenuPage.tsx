'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Search, SlidersHorizontal, X, PackageSearch } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import FoodCard, { type FoodCardProduct } from '@/components/urb/FoodCard'
import { get } from '@/services/api'

interface Category {
  id: string
  name: string
  slug: string
  productCount: number
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function MenuPage({ query }: { query: URLSearchParams }) {
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<FoodCardProduct[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // filter state — seeded from the URL query
  const [search, setSearch] = useState(query.get('search') || '')
  const [debounced, setDebounced] = useState(search)
  const [category, setCategory] = useState(query.get('category') || 'all')
  const [veg, setVeg] = useState<'all' | 'true' | 'false'>((query.get('veg') as 'true' | 'false') || 'all')
  const [sort, setSort] = useState(query.get('sort') || 'popular')
  const [page, setPage] = useState(1)
  const [showFilters, setShowFilters] = useState(false)
  const topRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    get<{ categories: Category[] }>('/api/categories').then((d) => setCategories(d.categories)).catch(() => {})
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const load = useCallback(async (opts: { append?: boolean } = {}) => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ page: String(page), limit: '12', sort })
      if (debounced.trim()) params.set('search', debounced.trim())
      if (category !== 'all') params.set('category', category)
      if (veg !== 'all') params.set('veg', veg)
      const data = await get<{ products: FoodCardProduct[]; pagination: Pagination }>(`/api/products?${params}`)
      setProducts((prev) => (opts.append ? [...prev, ...data.products] : data.products))
      setPagination(data.pagination)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [page, sort, debounced, category, veg])

  useEffect(() => {
    load()
  }, [load])

  // keep URL shareable
  useEffect(() => {
    const params = new URLSearchParams()
    if (debounced.trim()) params.set('search', debounced.trim())
    if (category !== 'all') params.set('category', category)
    if (veg !== 'all') params.set('veg', veg)
    if (sort !== 'popular') params.set('sort', sort)
    const qs = params.toString()
    window.history.replaceState(null, '', `#/menu${qs ? `?${qs}` : ''}`)
  }, [debounced, category, veg, sort])

  const resetFilters = () => {
    setSearch('')
    setCategory('all')
    setVeg('all')
    setSort('popular')
    setPage(1)
  }

  const activeCategory = categories.find((c) => c.slug === category)

  return (
    <div ref={topRef} className="mx-auto max-w-7xl px-4 sm:px-6 py-10 sm:py-14">
      {/* heading */}
      <div className="max-w-2xl">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary">The full spread</p>
        <h1 className="font-display mt-2 text-4xl sm:text-5xl font-bold">
          {activeCategory ? activeCategory.name.toUpperCase() : 'OUR MENU'}
        </h1>
        <p className="mt-3 text-sm text-neutral-500">
          {pagination ? `${pagination.total} dishes` : 'Loading…'} cooked to order — filter, sort and find your next favourite.
        </p>
      </div>

      {/* search + filter bar */}
      <div className="mt-8 flex flex-col lg:flex-row gap-3 lg:items-center">
        <div className="relative flex-1 max-w-xl">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" aria-hidden />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search dishes — try 'blaze', 'shake', 'paneer'…"
            className="pl-10 h-12 rounded-xl bg-white/5 border-white/10 text-white placeholder:text-neutral-600"
            aria-label="Search the menu"
          />
          {search && (
            <button onClick={() => setSearch('')} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Select value={sort} onValueChange={(v) => { setSort(v); setPage(1) }}>
            <SelectTrigger className="w-[170px] h-12 rounded-xl bg-white/5 border-white/10 text-white" aria-label="Sort dishes">
              <SlidersHorizontal className="w-4 h-4 mr-1 text-neutral-500" />
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1a1a] border-white/10 text-white">
              <SelectItem value="popular">Most popular</SelectItem>
              <SelectItem value="rating">Top rated</SelectItem>
              <SelectItem value="price_asc">Price: low → high</SelectItem>
              <SelectItem value="price_desc">Price: high → low</SelectItem>
              <SelectItem value="newest">Newest first</SelectItem>
            </SelectContent>
          </Select>

          {/* veg filter pills (desktop) */}
          <div className="hidden lg:flex items-center gap-1.5 rounded-xl bg-white/5 border border-white/10 p-1" role="group" aria-label="Food type filter">
            {([['all', 'All'], ['true', 'Veg'], ['false', 'Non-veg']] as const).map(([v, label]) => (
              <button
                key={v}
                onClick={() => { setVeg(v); setPage(1) }}
                aria-pressed={veg === v}
                className={`px-4 h-10 rounded-lg text-sm font-medium transition-colors ${veg === v ? 'bg-primary text-white' : 'text-neutral-400 hover:text-white'}`}
              >
                {label}
              </button>
            ))}
          </div>

          <Button variant="outline" className="lg:hidden h-12 rounded-xl border-white/10 text-white" onClick={() => setShowFilters((v) => !v)} aria-expanded={showFilters}>
            <SlidersHorizontal className="w-4 h-4 mr-1" /> Filters
          </Button>
        </div>
      </div>

      {/* mobile filter drawer */}
      {showFilters && (
        <div className="lg:hidden mt-3 rounded-xl border border-white/10 bg-card p-3 flex flex-col gap-3">
          <div className="flex items-center gap-1.5" role="group" aria-label="Food type filter">
            {([['all', 'All'], ['true', 'Veg only'], ['false', 'Non-veg only']] as const).map(([v, label]) => (
              <button
                key={v}
                onClick={() => { setVeg(v); setPage(1) }}
                aria-pressed={veg === v}
                className={`flex-1 px-3 h-10 rounded-lg text-sm font-medium transition-colors ${veg === v ? 'bg-primary text-white' : 'bg-white/5 text-neutral-400'}`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <CategoryPills categories={categories} category={category} setCategory={(c) => { setCategory(c); setPage(1) }} compact />
          </div>
        </div>
      )}

      {/* category pills (desktop) */}
      <div className="hidden lg:flex mt-6 items-center gap-2 overflow-x-auto no-scrollbar" role="tablist" aria-label="Categories">
        <CategoryPills categories={categories} category={category} setCategory={(c) => { setCategory(c); setPage(1) }} />
      </div>

      {/* error */}
      {error && (
        <div className="mt-10 rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center">
          <p className="text-sm text-red-300">{error}</p>
          <Button onClick={() => load()} variant="outline" className="mt-3 rounded-full border-white/15 text-white">Try again</Button>
        </div>
      )}

      {/* grid */}
      {!error && (
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {loading && products.length === 0
            ? Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-2xl bg-card border border-white/5 overflow-hidden">
                  <Skeleton className="aspect-[4/3] rounded-none bg-white/5" />
                  <div className="p-4 space-y-3">
                    <Skeleton className="h-4 w-3/4 bg-white/5" />
                    <Skeleton className="h-3 w-1/2 bg-white/5" />
                    <Skeleton className="h-8 w-full bg-white/5" />
                  </div>
                </div>
              ))
            : products.map((p, i) => <FoodCard key={p.id} product={p} index={i} />)}
        </div>
      )}

      {/* empty state */}
      {!loading && !error && products.length === 0 && (
        <div className="mt-10 py-16 text-center rounded-2xl border border-dashed border-white/10">
          <PackageSearch className="mx-auto w-10 h-10 text-neutral-600" aria-hidden />
          <h2 className="mt-4 font-display text-xl font-semibold">No dishes match your filters</h2>
          <p className="mt-2 text-sm text-neutral-500">Try clearing a filter or searching something else — the kitchen is big.</p>
          <Button onClick={resetFilters} className="mt-5 rounded-full bg-primary text-white">Clear all filters</Button>
        </div>
      )}

      {/* load more */}
      {pagination && pagination.page < pagination.totalPages && !loading && (
        <div className="mt-10 text-center">
          <Button
            variant="outline"
            disabled={loading}
            onClick={() => { const next = page + 1; setPage(next); load({ append: false }) }}
            className="rounded-full border-white/15 text-white px-8 h-12"
          >
            Load more ({pagination.total - products.length} remaining)
          </Button>
        </div>
      )}
    </div>
  )
}

function CategoryPills({
  categories,
  category,
  setCategory,
  compact = false,
}: {
  categories: Category[]
  category: string
  setCategory: (slug: string) => void
  compact?: boolean
}) {
  return (
    <>
      <button
        role="tab"
        aria-selected={category === 'all'}
        onClick={() => setCategory('all')}
        className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
          category === 'all' ? 'bg-primary text-white' : 'bg-white/5 text-neutral-400 hover:text-white border border-white/10'
        }`}
      >
        All
      </button>
      {categories.map((c) => (
        <button
          key={c.id}
          role="tab"
          aria-selected={category === c.slug}
          onClick={() => setCategory(c.slug)}
          className={`shrink-0 ${compact ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'} rounded-full font-medium transition-colors ${
            category === c.slug ? 'bg-primary text-white' : 'bg-white/5 text-neutral-400 hover:text-white border border-white/10'
          }`}
        >
          {c.name}
        </button>
      ))}
    </>
  )
}

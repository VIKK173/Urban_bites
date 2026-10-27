'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Flame, Search, ShoppingCart, Menu as MenuIcon, X, User, LogOut, LayoutDashboard,
  Package, Heart, ChevronDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { navigate } from '@/hooks/useHashRoute'
import { useAuthStore } from '@/store/auth-store'
import { useCartStore, cartCount } from '@/store/cart-store'
import { toast } from 'sonner'
import SearchDialog from '@/components/urb/SearchDialog'

const LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Menu', href: '/menu' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
]

export default function Navbar() {
  const { user, status, logout } = useAuthStore()
  const items = useCartStore((s) => s.items)
  const count = cartCount(items)
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const route = usePathnameSafe()
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleLogout = async () => {
    await logout()
    toast.success('Logged out. See you soon!')
    navigate('/')
  }

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 border-b ${
        scrolled ? 'bg-[#0b0b0b]/90 backdrop-blur-xl border-white/10 shadow-lg shadow-black/40' : 'bg-[#090909]/70 backdrop-blur-md border-transparent'
      }`}
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[60] focus:bg-primary focus:text-white focus:px-3 focus:py-2 focus:rounded-md focus:m-2"
      >
        Skip to content
      </a>
      <nav aria-label="Main navigation" className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        {/* logo */}
        <Link href="#/" className="flex items-center gap-2 shrink-0 group" aria-label="Urban Bites home">
          <span className="relative grid place-items-center w-9 h-9 rounded-xl bg-primary text-white glow-red transition-transform group-hover:scale-105">
            <Flame className="w-5 h-5" aria-hidden />
          </span>
          <span className="font-display text-xl font-bold tracking-wide">
            URBAN<span className="text-primary"> BITES</span>
          </span>
        </Link>

        {/* desktop links */}
        <div className="hidden md:flex items-center gap-1">
          {LINKS.map((l) => {
            const active = route === l.href
            return (
              <Link
                key={l.href}
                href={`#${l.href}`}
                onClick={() => setOpen(false)}
                aria-current={active ? 'page' : undefined}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  active ? 'text-primary bg-primary/10' : 'text-neutral-300 hover:text-white hover:bg-white/5'
                }`}
              >
                {l.label}
              </Link>
            )
          })}
        </div>

        {/* actions */}
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="icon" aria-label="Search food" onClick={() => setSearchOpen(true)} className="text-neutral-300 hover:text-white">
            <Search className="w-5 h-5" />
          </Button>

          <Button variant="ghost" size="icon" aria-label={`Cart, ${count} items`} onClick={() => navigate('/cart')} className="relative text-neutral-300 hover:text-white">
            <ShoppingCart className="w-5 h-5" />
            <AnimatePresence>
              {count > 0 && (
                <motion.span
                  key={count}
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.4, opacity: 0 }}
                  className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 grid place-items-center rounded-full bg-primary text-[10px] font-bold text-white"
                >
                  {count > 99 ? '99+' : count}
                </motion.span>
              )}
            </AnimatePresence>
          </Button>

          {status === 'loading' ? (
            <div className="hidden sm:block w-24 h-9 rounded-full bg-white/5 animate-pulse" />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="hidden sm:flex items-center gap-2 text-neutral-200 hover:text-white">
                  <span className="w-7 h-7 grid place-items-center rounded-full bg-primary/20 text-primary text-xs font-bold uppercase">
                    {user.name.charAt(0)}
                  </span>
                  <span className="max-w-[90px] truncate text-sm">{user.name.split(' ')[0]}</span>
                  <ChevronDown className="w-4 h-4 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 bg-[#151515] border-white/10">
                <DropdownMenuLabel className="text-xs text-neutral-400">
                  {user.email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem onClick={() => navigate('/profile')} className="gap-2 focus:bg-white/5 focus:text-white">
                  <User className="w-4 h-4" /> My Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/orders')} className="gap-2 focus:bg-white/5 focus:text-white">
                  <Package className="w-4 h-4" /> My Orders
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/profile?tab=favorites')} className="gap-2 focus:bg-white/5 focus:text-white">
                  <Heart className="w-4 h-4" /> Favorites
                </DropdownMenuItem>
                {user.role === 'ADMIN' && (
                  <DropdownMenuItem onClick={() => navigate('/admin')} className="gap-2 text-primary focus:bg-primary/10 focus:text-primary">
                    <LayoutDashboard className="w-4 h-4" /> Admin Dashboard
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem onClick={handleLogout} className="gap-2 text-red-400 focus:bg-red-500/10 focus:text-red-400">
                  <LogOut className="w-4 h-4" /> Log Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => navigate('/login')}
                className="rounded-full border-white/15 text-white hover:bg-white/10 hover:text-white"
              >
                Log In
              </Button>
              <Button onClick={() => navigate('/register')} className="rounded-full bg-primary hover:bg-primary/90 text-white">
                Sign Up
              </Button>
            </div>
          )}

          {/* hamburger */}
          <Button variant="ghost" size="icon" className="md:hidden text-neutral-200" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
            {open ? <X className="w-5 h-5" /> : <MenuIcon className="w-5 h-5" />}
          </Button>
        </div>
      </nav>

      {/* mobile drawer */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="md:hidden overflow-hidden border-t border-white/10 bg-[#0b0b0b]"
          >
            <div className="px-4 py-4 flex flex-col gap-1" onClick={(e) => { if ((e.target as HTMLElement).closest('a,button')) setOpen(false) }}>
              {LINKS.map((l) => (
                <Link key={l.href} href={`#${l.href}`} className={`px-3 py-2.5 rounded-lg text-sm font-medium ${route === l.href ? 'text-primary bg-primary/10' : 'text-neutral-200'}`}>
                  {l.label}
                </Link>
              ))}
              <Link href="#/support" className="px-3 py-2.5 rounded-lg text-sm font-medium text-neutral-200">Support</Link>
              <div className="h-px bg-white/10 my-2" />
              {user ? (
                <>
                  <Link href="#/profile" className="px-3 py-2.5 rounded-lg text-sm font-medium text-neutral-200">My Profile</Link>
                  <Link href="#/orders" className="px-3 py-2.5 rounded-lg text-sm font-medium text-neutral-200">My Orders</Link>
                  {user.role === 'ADMIN' && (
                    <Link href="#/admin" className="px-3 py-2.5 rounded-lg text-sm font-medium text-primary">Admin Dashboard</Link>
                  )}
                  <button onClick={handleLogout} className="px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 text-left">Log Out</button>
                </>
              ) : (
                <div className="flex gap-2 px-1 pt-1">
                  <Button variant="outline" className="flex-1 rounded-full border-white/15 text-white" onClick={() => navigate('/login')}>Log In</Button>
                  <Button className="flex-1 rounded-full bg-primary" onClick={() => navigate('/register')}>Sign Up</Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </header>
  )
}

/** tiny wrapper to derive current hash path without rerenders on query change */
function usePathnameSafe() {
  return useSyncExternalStore(
    (callback) => {
      window.addEventListener('hashchange', callback)
      return () => window.removeEventListener('hashchange', callback)
    },
    () => (typeof window !== 'undefined' ? window.location.hash.replace(/^#/, '').split('?')[0] || '/' : '/'),
    () => '/'
  )
}

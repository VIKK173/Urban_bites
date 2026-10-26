'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { useHashRoute } from '@/hooks/useHashRoute'
import { useAuthStore } from '@/store/auth-store'
import { useCartStore } from '@/store/cart-store'
import Navbar from '@/components/urb/Navbar'
import Footer from '@/components/urb/Footer'
import HomePage from '@/components/urb/pages/HomePage'
import MenuPage from '@/components/urb/pages/MenuPage'
import ProductPage from '@/components/urb/pages/ProductPage'
import CartPage from '@/components/urb/pages/CartPage'
import CheckoutPage from '@/components/urb/pages/CheckoutPage'
import OrderTrackingPage from '@/components/urb/pages/OrderTrackingPage'
import OrdersPage from '@/components/urb/pages/OrdersPage'
import LoginPage from '@/components/urb/pages/LoginPage'
import RegisterPage from '@/components/urb/pages/RegisterPage'
import ProfilePage from '@/components/urb/pages/ProfilePage'
import AboutPage from '@/components/urb/pages/AboutPage'
import ContactPage from '@/components/urb/pages/ContactPage'
import SupportPage from '@/components/urb/pages/SupportPage'
import AdminPage from '@/components/urb/pages/AdminPage'
import NotFoundPage from '@/components/urb/pages/NotFoundPage'

export default function UrbanBitesApp() {
  const route = useHashRoute()
  const bootstrap = useAuthStore((s) => s.bootstrap)
  const authStatus = useAuthStore((s) => s.status)
  const fetchCart = useCartStore((s) => s.fetchCart)

  useEffect(() => {
    bootstrap()
  }, [bootstrap])

  useEffect(() => {
    if (authStatus === 'authed') fetchCart()
    if (authStatus === 'guest') useCartStore.getState().reset()
  }, [authStatus, fetchCart])

  const seg = route.segments
  let page: React.ReactNode

  if (!route.ready) page = null
  else if (seg.length === 0) page = <HomePage />
  else if (seg[0] === 'menu') page = <MenuPage query={route.query} />
  else if (seg[0] === 'product' && seg[1]) page = <ProductPage slugOrId={seg[1]} />
  else if (seg[0] === 'cart') page = <CartPage />
  else if (seg[0] === 'checkout') page = <CheckoutPage />
  else if (seg[0] === 'order' && seg[1]) page = <OrderTrackingPage orderRef={seg[1]} />
  else if (seg[0] === 'orders') page = <OrdersPage />
  else if (seg[0] === 'login') page = <LoginPage />
  else if (seg[0] === 'register') page = <RegisterPage />
  else if (seg[0] === 'profile') page = <ProfilePage />
  else if (seg[0] === 'about') page = <AboutPage />
  else if (seg[0] === 'contact') page = <ContactPage />
  else if (seg[0] === 'support') page = <SupportPage />
  else if (seg[0] === 'admin') page = <AdminPage route={route} />
  else page = <NotFoundPage />

  const bare = seg[0] === 'checkout' // immersive flow without footer

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        {/* Enter-fade only: AnimatePresence mode="wait" requires the old page's
            exit animation to finish before the new page mounts, which can hang
            and leave the previous page stuck on screen. */}
        <motion.div
          key={route.raw.split('?')[0]}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
        >
          {page}
        </motion.div>
      </main>
      {!bare && <Footer />}
    </div>
  )
}

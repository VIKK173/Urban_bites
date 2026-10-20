'use client'

import { useEffect } from 'react'
import {
  LayoutDashboard, ShoppingBag, Pizza, Ticket, Star, Users, Settings as SettingsIcon, Flame,
} from 'lucide-react'
import { useAuthStore } from '@/store/auth-store'
import { navigate } from '@/hooks/useHashRoute'
import type { RouteInfo } from '@/hooks/useHashRoute'
import DashboardSection from '@/components/urb/admin/DashboardSection'
import OrdersSection from '@/components/urb/admin/OrdersSection'
import ProductsSection from '@/components/urb/admin/ProductsSection'
import CouponsSection from '@/components/urb/admin/CouponsSection'
import ReviewsSection from '@/components/urb/admin/ReviewsSection'
import UsersSection from '@/components/urb/admin/UsersSection'
import SettingsSection from '@/components/urb/admin/SettingsSection'

const TABS = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'orders', label: 'Orders', icon: ShoppingBag },
  { key: 'products', label: 'Products', icon: Pizza },
  { key: 'coupons', label: 'Coupons', icon: Ticket },
  { key: 'reviews', label: 'Reviews', icon: Star },
  { key: 'users', label: 'Users', icon: Users },
  { key: 'settings', label: 'Settings', icon: SettingsIcon },
] as const

type TabKey = (typeof TABS)[number]['key']

export default function AdminPage({ route }: { route: RouteInfo }) {
  const { user, status } = useAuthStore()
  const tabParam = route.segments[1] as TabKey | undefined
  // tab is fully derived from the URL — no state sync needed
  const tab: TabKey = TABS.some((t) => t.key === tabParam) ? tabParam! : 'dashboard'

  useEffect(() => {
    if (status === 'guest') navigate('/login')
  }, [status])

  useEffect(() => {
    if (status === 'authed' && user && user.role !== 'ADMIN') navigate('/404')
  }, [user, status])

  if (!user || user.role !== 'ADMIN') {
    return <div className="py-28 text-center text-sm text-neutral-500">Checking your access…</div>
  }

  const changeTab = (t: TabKey) => {
    navigate(`/admin/${t}`, { replace: true })
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* sidebar */}
        <aside className="lg:w-56 lg:shrink-0 lg:sticky lg:top-24 w-full">
          <div className="rounded-2xl bg-card border border-white/5 p-3">
            <p className="px-3 pt-1 pb-3 font-display text-sm font-bold uppercase tracking-widest text-neutral-500 flex items-center gap-2">
              <Flame className="w-4 h-4 text-primary" /> Admin console
            </p>
            <nav className="flex lg:flex-col gap-1 overflow-x-auto no-scrollbar" aria-label="Admin sections">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => changeTab(t.key)}
                  aria-current={tab === t.key ? 'page' : undefined}
                  className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                    tab === t.key ? 'bg-primary text-white' : 'text-neutral-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <t.icon className="w-4 h-4" aria-hidden /> {t.label}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* content */}
        <div className="flex-1 min-w-0 w-full">
          {tab === 'dashboard' && <DashboardSection onGoOrders={() => changeTab('orders')} />}
          {tab === 'orders' && <OrdersSection />}
          {tab === 'products' && <ProductsSection />}
          {tab === 'coupons' && <CouponsSection />}
          {tab === 'reviews' && <ReviewsSection />}
          {tab === 'users' && <UsersSection />}
          {tab === 'settings' && <SettingsSection />}
        </div>
      </div>
    </div>
  )
}

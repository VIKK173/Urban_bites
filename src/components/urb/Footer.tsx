'use client'

import Link from 'next/link'
import { Flame, Phone, Mail, MapPin, Clock, Instagram, Twitter, Facebook, Youtube } from 'lucide-react'

const Shop = [
  { label: 'Full Menu', href: '/menu' },
  { label: 'Best Sellers', href: '/menu?sort=popular' },
  { label: 'Vegetarian', href: '/menu?veg=true' },
  { label: 'Combos & Deals', href: '/menu?category=combos' },
]

const Company = [
  { label: 'About Us', href: '/about' },
  { label: 'Contact', href: '/contact' },
  { label: 'Support & FAQ', href: '/support' },
  { label: 'My Orders', href: '/orders' },
]

const Legal = [
  { label: 'Privacy Policy', href: '/support#privacy' },
  { label: 'Refund & Cancellation', href: '/support#refunds' },
  { label: 'Terms of Service', href: '/support#terms' },
]

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-white/10 bg-[#0b0b0b]" aria-label="Site footer">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10">
        {/* brand */}
        <div className="lg:col-span-2 space-y-4">
          <Link href="#/" className="flex items-center gap-2 w-fit">
            <span className="grid place-items-center w-9 h-9 rounded-xl bg-primary text-white">
              <Flame className="w-5 h-5" aria-hidden />
            </span>
            <span className="font-display text-xl font-bold tracking-wide">
              URBAN<span className="text-primary"> BITES</span>
            </span>
          </Link>
          <p className="text-sm text-neutral-400 leading-relaxed max-w-sm">
            Bold flavours. Fresh ingredients. Delivered to your door. Urban Bites is your late-night
            craving fix and your family feast headquarters — cooked to order, every single time.
          </p>
          <div className="flex items-center gap-2">
            {[
              { icon: Instagram, label: 'Instagram' },
              { icon: Twitter, label: 'Twitter' },
              { icon: Facebook, label: 'Facebook' },
              { icon: Youtube, label: 'YouTube' },
            ].map(({ icon: Icon, label }) => (
              <a
                key={label}
                href="#/contact"
                aria-label={`Urban Bites on ${label}`}
                className="w-9 h-9 grid place-items-center rounded-full bg-white/5 text-neutral-400 hover:text-white hover:bg-primary transition-colors"
              >
                <Icon className="w-4 h-4" />
              </a>
            ))}
          </div>
        </div>

        {/* link columns */}
        <nav aria-label="Shop links">
          <h3 className="font-display font-semibold text-sm uppercase tracking-widest text-neutral-500 mb-4">Shop</h3>
          <ul className="space-y-2.5">
            {Shop.map((l) => (
              <li key={l.label}>
                <Link href={`#${l.href}`} className="text-sm text-neutral-400 hover:text-primary transition-colors">{l.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Company links">
          <h3 className="font-display font-semibold text-sm uppercase tracking-widest text-neutral-500 mb-4">Company</h3>
          <ul className="space-y-2.5">
            {Company.map((l) => (
              <li key={l.label}>
                <Link href={`#${l.href}`} className="text-sm text-neutral-400 hover:text-primary transition-colors">{l.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <div>
          <h3 className="font-display font-semibold text-sm uppercase tracking-widest text-neutral-500 mb-4">Reach Us</h3>
          <ul className="space-y-3 text-sm text-neutral-400">
            <li className="flex gap-2.5"><MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" /> Shop 12, Food Street, Bandra West, Mumbai 400050</li>
            <li className="flex gap-2.5"><Phone className="w-4 h-4 text-primary shrink-0 mt-0.5" /> <a href="tel:+919876543210" className="hover:text-white">+91 98765 43210</a></li>
            <li className="flex gap-2.5"><Mail className="w-4 h-4 text-primary shrink-0 mt-0.5" /> <a href="mailto:hello@urbanbites.example" className="hover:text-white">hello@urbanbites.example</a></li>
            <li className="flex gap-2.5"><Clock className="w-4 h-4 text-primary shrink-0 mt-0.5" /> Mon–Sun · 11:00 AM – 11:30 PM</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/5">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-neutral-600">© {new Date().getFullYear()} Urban Bites. All rights reserved. Crafted with heat in Mumbai.</p>
          <nav aria-label="Legal links" className="flex items-center gap-4">
            {Legal.map((l) => (
              <Link key={l.label} href={`#${l.href}`} className="text-xs text-neutral-600 hover:text-neutral-300 transition-colors">{l.label}</Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  )
}

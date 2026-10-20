'use client'

import { motion } from 'framer-motion'
import { Flame, Leaf, HeartHandshake, Award, Clock, MapPin } from 'lucide-react'

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-12 sm:py-16">
      {/* hero */}
      <div className="text-center max-w-2xl mx-auto">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary">Our story</p>
        <h1 className="font-display mt-3 text-4xl sm:text-5xl font-bold leading-tight">
          BORN IN A TINY KITCHEN.<br />BUILT ON <span className="text-primary">FLAVOUR.</span>
        </h1>
        <p className="mt-5 text-neutral-400 leading-relaxed">
          Urban Bites started in 2021 as a two-burner kitchen with one grumpy chef, one big dream and a
          sauce recipe guarded like state secrets. Today we serve thousands of Mumbai households — but the
          rule hasn&apos;t changed: if we wouldn&apos;t devour it ourselves at 1 AM, it doesn&apos;t leave the kitchen.
        </p>
      </div>

      {/* image band */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="mt-10 rounded-3xl overflow-hidden border border-white/10 relative aspect-[16/7]"
      >
        { }
        <img src="/images/cat-combos.png" alt="A spread of Urban Bites favourites" className="w-full h-full object-cover" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" aria-hidden />
        <p className="absolute bottom-5 left-6 font-display text-xl font-bold">Fresh from the flame, every single day</p>
      </motion.div>

      {/* values */}
      <section className="mt-14" aria-labelledby="values-heading">
        <h2 id="values-heading" className="font-display text-2xl sm:text-3xl font-bold text-center">WHAT WE STAND FOR</h2>
        <div className="mt-8 grid sm:grid-cols-3 gap-5">
          {[
            {
              icon: Flame,
              title: 'Bold over boring',
              text: 'Every dish is seasoned to be remembered. Our peri peri glaze took 47 attempts. Worth every one.',
            },
            {
              icon: Leaf,
              title: 'Fresh is non-negotiable',
              text: 'Produce every morning, buns baked in-house, sauces made from scratch. Nothing sits, nothing freezes.',
            },
            {
              icon: HeartHandshake,
              title: 'Guests, not orders',
              text: 'Real humans on support, remake-or-refund without drama, and a kitchen that answers to your ratings.',
            },
          ].map((v, i) => (
            <motion.div
              key={v.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="rounded-2xl bg-card border border-white/5 p-6"
            >
              <span className="grid place-items-center w-11 h-11 rounded-xl bg-primary/10 text-primary">
                <v.icon className="w-5 h-5" aria-hidden />
              </span>
              <h3 className="mt-4 font-display text-lg font-semibold">{v.title}</h3>
              <p className="mt-2 text-sm text-neutral-400 leading-relaxed">{v.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* quality standards */}
      <section className="mt-14 rounded-3xl bg-card border border-white/5 p-8 sm:p-10" aria-labelledby="quality-heading">
        <div className="grid md:grid-cols-[auto_1fr] gap-6">
          <span className="grid place-items-center w-14 h-14 rounded-2xl bg-primary text-white shrink-0">
            <Award className="w-7 h-7" aria-hidden />
          </span>
          <div>
            <h2 id="quality-heading" className="font-display text-2xl font-bold">FOOD QUALITY STANDARDS</h2>
            <ul className="mt-4 space-y-3 text-sm text-neutral-400 leading-relaxed">
              <li className="flex gap-3"><Clock className="w-4 h-4 text-primary shrink-0 mt-0.5" /> Cook-to-order: nothing is pre-fried and reheated. Your patty hits the grill after you hit “Place Order”.</li>
              <li className="flex gap-3"><Leaf className="w-4 h-4 text-primary shrink-0 mt-0.5" /> FSSAI-certified kitchen with daily temperature logs, colour-coded prep zones and monthly third-party hygiene audits.</li>
              <li className="flex gap-3"><HeartHandshake className="w-4 h-4 text-primary shrink-0 mt-0.5" /> Ingredient traceability: every batch of meat, dairy and produce is logged with its supplier and delivery date.</li>
              <li className="flex gap-3"><Flame className="w-4 h-4 text-primary shrink-0 mt-0.5" /> Spiciness you can trust: our 0–3 chilli scale is calibrated by a panel of very brave volunteers.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* visit us */}
      <section className="mt-10 rounded-3xl border border-white/10 p-8 text-center" aria-labelledby="visit-heading">
        <MapPin className="mx-auto w-8 h-8 text-primary" aria-hidden />
        <h2 id="visit-heading" className="font-display mt-3 text-2xl font-bold">COME SAY HI</h2>
        <p className="mt-2 text-sm text-neutral-400">Shop 12, Food Street, Bandra West, Mumbai 400050</p>
        <p className="text-sm text-neutral-500">Mon–Sun · 11:00 AM – 11:30 PM</p>
      </section>
    </div>
  )
}

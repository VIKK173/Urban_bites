'use client'

import { useState } from 'react'
import { ChevronDown, LifeBuoy, RotateCcw, Shield, FileText, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { post } from '@/services/api'
import { toast } from 'sonner'

const FAQS = [
  {
    q: 'How long does delivery take?',
    a: 'Our average delivery is 35 minutes across most of the city. You can watch your order move through each stage live on the tracking page — from confirmed to out for delivery.',
  },
  {
    q: 'Can I cancel my order?',
    a: 'Yes — while the order status is “Order Placed” or “Confirmed”, open the tracking page and tap Cancel. Once the kitchen starts cooking (Preparing), we can’t cancel because the food is literally on the flame.',
  },
  {
    q: 'How do refunds work?',
    a: 'Online payments refunded for cancelled orders are processed within 3–5 business days back to the original payment method. For quality issues on delivered orders, contact support — we remake or refund, your choice.',
  },
  {
    q: 'Is my online payment safe?',
    a: 'Absolutely. Payments run through Razorpay, and every transaction is signature-verified on our servers before your order is confirmed. We never store your card details.',
  },
  {
    q: 'Do you have vegetarian options?',
    a: 'Look for the green dot on every dish — filter the menu by “Veg” to see the full vegetarian range. The Crispy Veg Supreme and Paneer Tikka Wrap are staff favourites.',
  },
  {
    q: 'How do coupons work?',
    a: 'Apply a coupon in the cart before checkout. Each code has a minimum order value; the discount is validated and applied server-side. Check the Special Offer banner on the homepage for the current code.',
  },
]

export default function SupportPage() {
  const [form, setForm] = useState({ name: '', email: '', orderNumber: '', issue: '', message: '' })
  const [sending, setSending] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (sending) return
    setSending(true)
    try {
      const res = await post<{ message: string }>('/api/contact', {
        name: form.name,
        email: form.email,
        subject: `Order support: ${form.orderNumber || 'general'} — ${form.issue}`,
        message: form.message,
      })
      toast.success(res.message)
      setForm({ name: '', email: '', orderNumber: '', issue: '', message: '' })
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-12 sm:py-16">
      <div className="text-center max-w-xl mx-auto">
        <span className="mx-auto grid place-items-center w-14 h-14 rounded-2xl bg-primary/10 text-primary">
          <LifeBuoy className="w-7 h-7" aria-hidden />
        </span>
        <h1 className="font-display mt-4 text-4xl sm:text-5xl font-bold">SUPPORT & FAQ</h1>
        <p className="mt-3 text-sm text-neutral-500">Answers to the questions we hear most — plus a direct line to a human.</p>
      </div>

      {/* FAQ */}
      <section className="mt-10" aria-labelledby="faq-heading">
        <h2 id="faq-heading" className="font-display text-2xl font-bold flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-primary" /> Frequently asked questions
        </h2>
        <Accordion type="single" collapsible className="mt-5 rounded-2xl bg-card border border-white/5 px-5">
          {FAQS.map((f, i) => (
            <AccordionItem key={i} value={`faq-${i}`} className="border-white/5">
              <AccordionTrigger className="text-sm font-semibold text-white hover:text-primary hover:no-underline py-4">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-neutral-400 leading-relaxed">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* policies */}
      <section className="mt-12 grid sm:grid-cols-3 gap-4" aria-label="Policies">
        {[
          { id: 'refunds', icon: RotateCcw, title: 'Refund & Cancellation', text: 'Cancel free until cooking starts. Online refunds land back in 3–5 business days. Quality issues always remade or refunded.' },
          { id: 'privacy', icon: Shield, title: 'Privacy Policy', text: 'We store only what an order needs: your name, contact, addresses and order history. We never sell your data. Passwords are hashed with bcrypt.' },
          { id: 'terms', icon: FileText, title: 'Terms of Service', text: 'Prices include taxes as shown. Duplicate charges from payment retries are auto-detected and refunded. Abuse of remake policy may be limited.' },
        ].map((p) => (
          <article key={p.id} id={p.id} className="scroll-mt-24 rounded-2xl bg-card border border-white/5 p-5">
            <p.icon className="w-5 h-5 text-primary" aria-hidden />
            <h3 className="mt-3 font-display text-base font-semibold">{p.title}</h3>
            <p className="mt-2 text-xs text-neutral-400 leading-relaxed">{p.text}</p>
          </article>
        ))}
      </section>

      {/* support form */}
      <section className="mt-12 rounded-3xl bg-card border border-white/5 p-6 sm:p-8" aria-labelledby="support-form-heading">
        <h2 id="support-form-heading" className="font-display text-2xl font-bold">ORDER-RELATED ISSUE?</h2>
        <p className="mt-1.5 text-sm text-neutral-500">Tell us the order number and what went sideways — we move fast.</p>
        <form onSubmit={submit} className="mt-6 grid sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="sp-name" className="text-neutral-300">Name</Label>
            <Input id="sp-name" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="mt-1.5 h-11 bg-white/5 border-white/10 text-white" />
          </div>
          <div>
            <Label htmlFor="sp-email" className="text-neutral-300">Email</Label>
            <Input id="sp-email" type="email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="mt-1.5 h-11 bg-white/5 border-white/10 text-white" />
          </div>
          <div>
            <Label htmlFor="sp-order" className="text-neutral-300">Order number (if any)</Label>
            <Input id="sp-order" value={form.orderNumber} onChange={(e) => setForm((f) => ({ ...f, orderNumber: e.target.value }))} className="mt-1.5 h-11 bg-white/5 border-white/10 text-white" placeholder="UB…" />
          </div>
          <div>
            <Label htmlFor="sp-issue" className="text-neutral-300">Issue type</Label>
            <Input id="sp-issue" value={form.issue} onChange={(e) => setForm((f) => ({ ...f, issue: e.target.value }))} className="mt-1.5 h-11 bg-white/5 border-white/10 text-white" placeholder="Late / missing item / quality / refund" />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="sp-message" className="text-neutral-300">Describe what happened</Label>
            <Textarea id="sp-message" required minLength={10} value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} className="mt-1.5 min-h-28 bg-white/5 border-white/10 text-white" />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={sending} className="w-full h-12 rounded-full bg-primary hover:bg-primary/90 font-bold">
              {sending ? 'Sending…' : 'Send to support'}
            </Button>
          </div>
        </form>
      </section>
    </div>
  )
}

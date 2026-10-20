'use client'

import { useEffect, useState } from 'react'
import { Mail, MapPin, Phone, Clock, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { post } from '@/services/api'
import { toast } from 'sonner'

interface ContactInfo {
  address: string
  phone: string
  email: string
  openHours: string
  mapLat: number
  mapLng: number
}

export default function ContactPage() {
  const [info, setInfo] = useState<ContactInfo | null>(null)
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' })
  const [sending, setSending] = useState(false)

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((d) => d.success && setInfo(d.data.settings.contact))
      .catch(() => {})
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (sending) return
    setSending(true)
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error?.message || 'Could not send message')
      toast.success(json.data.message)
      setForm({ name: '', email: '', phone: '', subject: '', message: '' })
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-12 sm:py-16">
      <div className="max-w-xl">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary">We read everything</p>
        <h1 className="font-display mt-2 text-4xl sm:text-5xl font-bold">GET IN TOUCH</h1>
        <p className="mt-3 text-sm text-neutral-500">Compliments, complaints, catering for 200 people — send it over.</p>
      </div>

      <div className="mt-10 grid lg:grid-cols-[1fr_1.2fr] gap-8 items-start">
        {/* info + map */}
        <div className="space-y-4">
          {[
            { icon: MapPin, label: 'Visit us', value: info?.address || 'Shop 12, Food Street, Bandra West, Mumbai 400050' },
            { icon: Phone, label: 'Call us', value: info?.phone || '+91 98765 43210', href: 'tel:+919876543210' },
            { icon: Mail, label: 'Email', value: info?.email || 'hello@urbanbites.example', href: `mailto:${info?.email || 'hello@urbanbites.example'}` },
            { icon: Clock, label: 'Hours', value: info?.openHours || 'Mon–Sun · 11:00 AM – 11:30 PM' },
          ].map((c) => (
            <div key={c.label} className="rounded-2xl bg-card border border-white/5 p-4 flex gap-3">
              <span className="grid place-items-center w-10 h-10 rounded-xl bg-primary/10 text-primary shrink-0">
                <c.icon className="w-5 h-5" aria-hidden />
              </span>
              <div>
                <p className="text-xs uppercase tracking-widest text-neutral-500">{c.label}</p>
                {c.href ? (
                  <a href={c.href} className="text-sm text-white hover:text-primary transition-colors">{c.value}</a>
                ) : (
                  <p className="text-sm text-white">{c.value}</p>
                )}
              </div>
            </div>
          ))}

          {/* OpenStreetMap embed (no API key required) */}
          <div className="rounded-2xl overflow-hidden border border-white/10 aspect-[4/3] bg-[#111]" aria-label="Map showing Urban Bites location">
            <iframe
              title="Urban Bites on OpenStreetMap"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${(info?.mapLng ?? 72.8295) - 0.008}%2C${(info?.mapLat ?? 19.0596) - 0.005}%2C${(info?.mapLng ?? 72.8295) + 0.008}%2C${(info?.mapLat ?? 19.0596) + 0.005}&layer=mapnik&marker=${info?.mapLat ?? 19.0596}%2C${info?.mapLng ?? 72.8295}`}
              className="w-full h-full"
              loading="lazy"
            />
          </div>
        </div>

        {/* form */}
        <form onSubmit={submit} className="rounded-3xl bg-card border border-white/5 p-6 sm:p-8 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="ct-name" className="text-neutral-300">Your name</Label>
              <Input id="ct-name" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="mt-1.5 h-11 bg-white/5 border-white/10 text-white" placeholder="Priya Sharma" />
            </div>
            <div>
              <Label htmlFor="ct-email" className="text-neutral-300">Email</Label>
              <Input id="ct-email" type="email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="mt-1.5 h-11 bg-white/5 border-white/10 text-white" placeholder="you@example.com" />
            </div>
            <div>
              <Label htmlFor="ct-phone" className="text-neutral-300">Phone (optional)</Label>
              <Input id="ct-phone" inputMode="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className="mt-1.5 h-11 bg-white/5 border-white/10 text-white" placeholder="98765 43210" />
            </div>
            <div>
              <Label htmlFor="ct-subject" className="text-neutral-300">Subject (optional)</Label>
              <Input id="ct-subject" value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} className="mt-1.5 h-11 bg-white/5 border-white/10 text-white" placeholder="Catering enquiry" />
            </div>
          </div>
          <div>
            <Label htmlFor="ct-message" className="text-neutral-300">Message</Label>
            <Textarea id="ct-message" required minLength={10} maxLength={2000} value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} className="mt-1.5 min-h-32 bg-white/5 border-white/10 text-white" placeholder="Tell us what's on your mind…" />
          </div>
          <Button type="submit" disabled={sending} className="w-full h-12 rounded-full bg-primary hover:bg-primary/90 font-bold">
            <Send className="w-4 h-4 mr-2" /> {sending ? 'Sending…' : 'Send message'}
          </Button>
          <p className="text-xs text-neutral-600 text-center">We reply within one working day — usually much faster.</p>
        </form>
      </div>
    </div>
  )
}

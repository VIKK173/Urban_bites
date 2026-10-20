'use client'

import { useCallback, useEffect, useState } from 'react'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { get, patch } from '@/services/api'
import { formatINR } from '@/lib/money'
import { toast } from 'sonner'

interface AdminUser {
  id: string
  name: string
  email: string
  phone: string | null
  role: 'CUSTOMER' | 'ADMIN'
  createdAt: string
  orderCount: number
  totalSpend: number
}

export default function UsersSection() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '15' })
      if (search.trim()) params.set('search', search.trim())
      if (role !== 'all') params.set('role', role)
      const d = await get<{ users: AdminUser[]; pagination: { totalPages: number } }>(`/api/admin/users?${params}`)
      setUsers(d.users)
      setTotalPages(d.pagination.totalPages)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [page, search, role])

  useEffect(() => {
    const t = setTimeout(load, 250)
    return () => clearTimeout(t)
  }, [load])

  const changeRole = async (u: AdminUser, newRole: 'CUSTOMER' | 'ADMIN') => {
    try {
      await patch('/api/admin/users', { userId: u.id, role: newRole })
      toast.success(`${u.name} is now ${newRole === 'ADMIN' ? 'an admin' : 'a customer'}`)
      load()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold">USERS</h1>
          <p className="text-xs text-neutral-500">Customer accounts and their lifetime value.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" aria-hidden />
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search name / email…"
              className="pl-9 h-10 w-56 rounded-xl bg-white/5 border-white/10 text-white text-sm"
              aria-label="Search users"
            />
          </div>
          <Select value={role} onValueChange={(v) => { setRole(v); setPage(1) }}>
            <SelectTrigger className="w-32 h-10 rounded-xl bg-white/5 border-white/10 text-white text-sm" aria-label="Filter by role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1a1a] border-white/10 text-white">
              <SelectItem value="all">All roles</SelectItem>
              <SelectItem value="CUSTOMER">Customers</SelectItem>
              <SelectItem value="ADMIN">Admins</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-2xl bg-card border border-white/5 overflow-x-auto thin-scrollbar">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-neutral-500 border-b border-white/5">
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Joined</th>
              <th className="px-4 py-3 font-medium">Orders</th>
              <th className="px-4 py-3 font-medium">Lifetime spend</th>
              <th className="px-4 py-3 font-medium">Role</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading && <tr><td colSpan={5} className="px-4 py-10 text-center text-neutral-500">Loading…</td></tr>}
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-white/[0.02]">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className={`grid place-items-center w-9 h-9 rounded-full text-xs font-bold uppercase ${u.role === 'ADMIN' ? 'bg-primary text-white' : 'bg-white/10 text-neutral-300'}`}>
                      {u.name.charAt(0)}
                    </span>
                    <div>
                      <p className="font-medium">{u.name}</p>
                      <p className="text-[11px] text-neutral-600">{u.email}{u.phone ? ` · ${u.phone}` : ''}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-neutral-400 text-xs">{new Date(u.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                <td className="px-4 py-3 text-neutral-300">{u.orderCount}</td>
                <td className="px-4 py-3 font-semibold">{formatINR(u.totalSpend)}</td>
                <td className="px-4 py-3">
                  <Select value={u.role} onValueChange={(v) => changeRole(u, v as 'CUSTOMER' | 'ADMIN')}>
                    <SelectTrigger className={`w-28 h-8 rounded-full text-xs border ${u.role === 'ADMIN' ? 'border-primary/50 text-primary' : 'border-white/10 text-neutral-300'} bg-white/5`} aria-label={`Role for ${u.name}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a1a] border-white/10 text-white">
                      <SelectItem value="CUSTOMER">Customer</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-neutral-500">
        <span>Page {page} of {totalPages}</span>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-full border-white/10 text-neutral-400" aria-label="Previous page">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-full border-white/10 text-neutral-400" aria-label="Next page">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

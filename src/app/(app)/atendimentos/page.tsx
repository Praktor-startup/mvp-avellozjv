'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDate, maskCPF } from '@/lib/utils'
import { Plus, Search, Bell, Eye, Edit, SlidersHorizontal, X } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Seller, Status } from '@/types'

interface ServiceRow {
  id: string
  name: string
  cpf: string
  entry_date: string
  reminder_active: boolean
  next_consultation_date: string | null
  seller: { name: string } | null
  motorcycle_type: { model: string } | null
  status: { description: string; is_closed: boolean; is_lost: boolean; generates_reminder: boolean } | null
  credit_checks: { id: string; check_date: string }[]
}

function statusVariant(status: ServiceRow['status']) {
  if (!status) return 'secondary' as const
  if (status.is_closed) return 'success' as const
  if (status.is_lost) return 'danger' as const
  if (status.generates_reminder) return 'warning' as const
  return 'default' as const
}

export default function AtendimentosPage() {
  const router = useRouter()
  const [services, setServices] = useState<ServiceRow[]>([])
  const [sellers, setSellers] = useState<Seller[]>([])
  const [statuses, setStatuses] = useState<Status[]>([])
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)

  const [search, setSearch] = useState('')
  const [filterSeller, setFilterSeller] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterReminder, setFilterReminder] = useState('')

  const hasFilters = !!(filterSeller || filterStatus || filterReminder)

  const load = useCallback(async () => {
    const supabase = createClient()
    setLoading(true)
    let query = supabase
      .from('customer_services')
      .select(`id, name, cpf, entry_date, reminder_active, next_consultation_date,
        seller:seller_id(name), motorcycle_type:motorcycle_type_id(model),
        status:status_id(description,is_closed,is_lost,generates_reminder),
        credit_checks(id,check_date)`)
      .order('entry_date', { ascending: false })

    if (filterSeller) query = query.eq('seller_id', filterSeller)
    if (filterStatus) query = query.eq('status_id', filterStatus)
    if (filterReminder === 'yes') query = query.eq('reminder_active', true)

    const { data } = await query
    let rows = (data ?? []) as unknown as ServiceRow[]
    if (search) {
      const s = search.toLowerCase()
      rows = rows.filter(
        (r) => r.name.toLowerCase().includes(s) || r.cpf.replace(/\D/g, '').includes(s.replace(/\D/g, ''))
      )
    }
    setServices(rows)
    setLoading(false)
  }, [search, filterSeller, filterStatus, filterReminder])

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from('sellers').select('*').eq('active', true).order('name'),
      supabase.from('statuses').select('*').eq('active', true).order('sort_order'),
    ]).then(([s, st]) => {
      setSellers((s.data ?? []) as Seller[])
      setStatuses((st.data ?? []) as Status[])
    })
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header
        title="Atendimentos"
        subtitle={loading ? '' : `${services.length} registro${services.length !== 1 ? 's' : ''}`}
        actions={
          <Button size="sm" onClick={() => router.push('/atendimentos/novo')}>
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Novo atendimento</span>
            <span className="sm:hidden">Novo</span>
          </Button>
        }
      />

      <div className="flex-1 overflow-y-auto bg-slate-50">
        <div className="p-4 sm:p-6 space-y-4">

          {/* Barra de busca + filtros */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nome ou CPF..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                hasFilters
                  ? 'bg-indigo-600 border-indigo-600 text-white'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">Filtros</span>
              {hasFilters && <span className="w-1.5 h-1.5 rounded-full bg-white/80" />}
            </button>
          </div>

          {/* Painel de filtros */}
          {showFilters && (
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Filtros</p>
                {hasFilters && (
                  <button
                    onClick={() => { setFilterSeller(''); setFilterStatus(''); setFilterReminder('') }}
                    className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                  >
                    <X className="w-3 h-3" /> Limpar
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Vendedor</label>
                  <select
                    value={filterSeller}
                    onChange={(e) => setFilterSeller(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 bg-white"
                  >
                    <option value="">Todos</option>
                    {sellers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Status</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 bg-white"
                  >
                    <option value="">Todos</option>
                    {statuses.map((s) => <option key={s.id} value={s.id}>{s.description}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Reconsultas</label>
                  <select
                    value={filterReminder}
                    onChange={(e) => setFilterReminder(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 bg-white"
                  >
                    <option value="">Todos</option>
                    <option value="yes">Com lembrete ativo</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="py-16 text-center text-sm text-slate-400">Carregando...</div>
          ) : services.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-slate-400 text-sm">Nenhum atendimento encontrado</p>
            </div>
          ) : (
            <>
              {/* Cards — mobile */}
              <div className="sm:hidden space-y-2">
                {services.map((s) => (
                  <Link
                    key={s.id}
                    href={`/atendimentos/${s.id}`}
                    className="block bg-white border border-slate-200 rounded-xl p-4 active:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                          <span className="text-xs font-black text-indigo-600">{s.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 text-sm truncate">{s.name}</p>
                          <p className="text-xs text-slate-400 font-mono">{maskCPF(s.cpf)}</p>
                        </div>
                      </div>
                      {s.status && (
                        <Badge variant={statusVariant(s.status)} className="text-xs shrink-0">{s.status.description}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                      <span>{formatDate(s.entry_date)}</span>
                      {s.seller && <span>· {s.seller.name}</span>}
                      {s.motorcycle_type && <span>· {s.motorcycle_type.model}</span>}
                      {s.reminder_active && (
                        <span className="flex items-center gap-1 text-amber-600 font-medium">
                          <Bell className="w-3 h-3" />
                          {s.next_consultation_date ? formatDate(s.next_consultation_date) : 'Reconsulta'}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>

              {/* Tabela — desktop */}
              <div className="hidden sm:block bg-white border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/80">
                      {['Entrada', 'Cliente', 'CPF', 'Vendedor', 'Moto', 'Status', 'Próx. consulta', ''].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {services.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-xs">{formatDate(s.entry_date)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                              <span className="text-xs font-black text-indigo-600">{s.name.charAt(0).toUpperCase()}</span>
                            </div>
                            <span className="font-semibold text-slate-900 whitespace-nowrap">{s.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-400 font-mono text-xs">{maskCPF(s.cpf)}</td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap text-xs">{s.seller?.name ?? '—'}</td>
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-xs">{s.motorcycle_type?.model ?? '—'}</td>
                        <td className="px-4 py-3">
                          {s.status ? <Badge variant={statusVariant(s.status)}>{s.status.description}</Badge> : '—'}
                        </td>
                        <td className="px-4 py-3">
                          {s.next_consultation_date ? (
                            <span className="flex items-center gap-1 text-amber-600 text-xs font-medium">
                              <Bell className="h-3 w-3" />
                              {formatDate(s.next_consultation_date)}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <Link href={`/atendimentos/${s.id}`}>
                              <button className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors">
                                <Eye className="h-3.5 w-3.5" />
                              </button>
                            </Link>
                            <Link href={`/atendimentos/${s.id}/editar`}>
                              <button className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors">
                                <Edit className="h-3.5 w-3.5" />
                              </button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

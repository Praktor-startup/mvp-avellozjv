'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { formatDate, maskCPF } from '@/lib/utils'
import { Plus, Search, Filter, Eye, Edit, Bell } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Seller, Status, MotorcycleType, LossReason } from '@/types'

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
  loss_reason: { description: string } | null
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

  const [search, setSearch] = useState('')
  const [filterSeller, setFilterSeller] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterReminder, setFilterReminder] = useState('')

  const load = useCallback(async () => {
    const supabase = createClient()
    setLoading(true)

    let query = supabase
      .from('customer_services')
      .select(`
        id, name, cpf, entry_date, reminder_active, next_consultation_date,
        seller:seller_id(name),
        motorcycle_type:motorcycle_type_id(model),
        status:status_id(description,is_closed,is_lost,generates_reminder),
        loss_reason:loss_reason_id(description),
        credit_checks(id,check_date)
      `)
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
    async function loadMeta() {
      const supabase = createClient()
      const [s, st] = await Promise.all([
        supabase.from('sellers').select('*').eq('active', true).order('name'),
        supabase.from('statuses').select('*').eq('active', true).order('sort_order'),
      ])
      setSellers((s.data ?? []) as Seller[])
      setStatuses((st.data ?? []) as Status[])
    }
    loadMeta()
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header
        title="Atendimentos"
        subtitle={`${services.length} registro${services.length !== 1 ? 's' : ''}`}
        actions={
          <Button size="sm" onClick={() => router.push('/atendimentos/novo')}>
            <Plus className="h-4 w-4" />
            Novo atendimento
          </Button>
        }
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Filtros */}
        <Card>
          <div className="p-4 flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-48">
              <Input
                placeholder="Buscar por nome ou CPF..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="w-44">
              <Select
                placeholder="Vendedor"
                value={filterSeller}
                onChange={(e) => setFilterSeller(e.target.value)}
                options={sellers.map((s) => ({ value: s.id, label: s.name }))}
              />
            </div>
            <div className="w-52">
              <Select
                placeholder="Status"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                options={statuses.map((s) => ({ value: s.id, label: s.description }))}
              />
            </div>
            <div className="w-48">
              <Select
                placeholder="Reconsultas"
                value={filterReminder}
                onChange={(e) => setFilterReminder(e.target.value)}
                options={[{ value: 'yes', label: 'Com lembrete ativo' }]}
              />
            </div>
            {(filterSeller || filterStatus || filterReminder) && (
              <Button variant="ghost" size="sm" onClick={() => { setFilterSeller(''); setFilterStatus(''); setFilterReminder('') }}>
                Limpar filtros
              </Button>
            )}
          </div>
        </Card>

        {/* Cards (mobile) */}
        <div className="md:hidden space-y-3">
          {loading ? (
            <div className="py-12 text-center text-slate-400">Carregando...</div>
          ) : services.length === 0 ? (
            <div className="py-12 text-center text-slate-400">Nenhum atendimento encontrado</div>
          ) : (
            services.map((s) => (
              <Link key={s.id} href={`/atendimentos/${s.id}`}>
                <Card className="p-4 active:bg-slate-50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-indigo-600">{s.name.charAt(0)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-slate-900 truncate">{s.name}</p>
                        {s.status && <Badge variant={statusVariant(s.status)}>{s.status.description}</Badge>}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 font-mono">{maskCPF(s.cpf)}</p>
                      <div className="flex items-center gap-2 flex-wrap mt-1.5 text-xs text-slate-600">
                        <span>{s.seller?.name ?? '—'}</span>
                        {s.motorcycle_type?.model && <><span className="text-slate-300">·</span><span>{s.motorcycle_type.model}</span></>}
                        <span className="text-slate-300">·</span>
                        <span>{formatDate(s.entry_date)}</span>
                      </div>
                      {s.next_consultation_date && (
                        <p className="flex items-center gap-1 text-amber-600 text-xs font-medium mt-1.5">
                          <Bell className="h-3 w-3" />
                          Próx. consulta: {formatDate(s.next_consultation_date)}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            ))
          )}
        </div>

        {/* Tabela (desktop) */}
        <Card className="hidden md:block">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70">
                  <th className="px-4 py-3 text-left font-medium text-slate-500 text-xs uppercase tracking-wide">Data entrada</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500 text-xs uppercase tracking-wide">Cliente</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500 text-xs uppercase tracking-wide">CPF</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500 text-xs uppercase tracking-wide">Vendedor</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500 text-xs uppercase tracking-wide">Moto</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500 text-xs uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500 text-xs uppercase tracking-wide">Última consulta</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500 text-xs uppercase tracking-wide">Próx. consulta</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500 text-xs uppercase tracking-wide">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-400">Carregando...</td></tr>
                ) : services.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-400">Nenhum atendimento encontrado</td></tr>
                ) : (
                  services.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDate(s.entry_date)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-indigo-600">{s.name.charAt(0)}</span>
                          </div>
                          <span className="font-medium text-slate-900 whitespace-nowrap">{s.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500 font-mono text-xs">{maskCPF(s.cpf)}</td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{s.seller?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap text-xs">{s.motorcycle_type?.model ?? '—'}</td>
                      <td className="px-4 py-3">
                        {s.status ? (
                          <Badge variant={statusVariant(s.status)}>{s.status.description}</Badge>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap text-xs">
                        {s.credit_checks?.length > 0
                          ? formatDate(s.credit_checks[s.credit_checks.length - 1].check_date)
                          : '—'}
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
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                          <Link href={`/atendimentos/${s.id}/editar`}>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}

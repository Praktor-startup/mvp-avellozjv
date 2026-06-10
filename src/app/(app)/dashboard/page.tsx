'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/header'
import { StatCard } from '@/components/ui/stat-card'
import {
  Users, UserCheck, FileSearch, CheckCircle,
  XCircle, ShoppingBag, TrendingDown, Bell,
  Percent, AlertTriangle, Clock, ArrowRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate, maskCPF } from '@/lib/utils'
import Link from 'next/link'

interface Stats {
  total_entries: number
  total_attended: number
  total_consultations: number
  total_approved: number
  total_restriction: number
  total_closed: number
  total_lost: number
  total_pending_reminders: number
  total_awaiting_sale: number
}

interface RecentService {
  id: string
  name: string
  cpf: string
  entry_date: string
  status: { description: string; is_closed: boolean; is_lost: boolean; generates_reminder: boolean } | null
  seller: { name: string } | null
}

interface UpcomingReminder {
  id: string
  due_date: string
  customer_service: {
    id: string
    name: string
    cpf: string
  } | null
  seller: { name: string } | null
}

function statusVariant(status: RecentService['status']) {
  if (!status) return 'secondary'
  if (status.is_closed) return 'success'
  if (status.is_lost) return 'danger'
  if (status.generates_reminder) return 'warning'
  return 'default'
}

function pct(num: number, den: number) {
  if (!den) return '0%'
  return `${Math.round((num / den) * 100)}%`
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [recent, setRecent] = useState<RecentService[]>([])
  const [reminders, setReminders] = useState<UpcomingReminder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()

      const [servicesRes, remindersRes] = await Promise.all([
        supabase
          .from('customer_services')
          .select('id, name, cpf, entry_date, status:status_id(description,is_closed,is_lost,generates_reminder), seller:seller_id(name)')
          .order('entry_date', { ascending: false })
          .limit(5),
        supabase
          .from('reminders')
          .select('id, due_date, customer_service:customer_service_id(id,name,cpf), seller:seller_id(name)')
          .eq('status', 'pending')
          .order('due_date', { ascending: true })
          .limit(5),
      ])

      const allServices = await supabase
        .from('customer_services')
        .select('status_id, seller_id, reminder_active, statuses:status_id(is_closed,is_lost,generates_reminder,description)')

      if (allServices.data) {
        const data = allServices.data as any[]
        const total_entries = data.length
        const total_attended = data.filter((d) => d.seller_id).length
        const total_closed = data.filter((d) => d.statuses?.is_closed).length
        const total_lost = data.filter((d) => d.statuses?.is_lost).length
        const total_pending_reminders = data.filter((d) => d.reminder_active).length
        const total_awaiting_sale = data.filter((d) => d.statuses?.description === 'Consulta aprovada').length

        const ccRes = await supabase.from('credit_checks').select('id, result')
        const total_consultations = ccRes.data?.length ?? 0
        const total_approved = ccRes.data?.filter((c) => c.result === 'approved').length ?? 0
        const total_restriction = ccRes.data?.filter((c) => ['restriction', 'denied'].includes(c.result)).length ?? 0

        setStats({
          total_entries,
          total_attended,
          total_consultations,
          total_approved,
          total_restriction,
          total_closed,
          total_lost,
          total_pending_reminders,
          total_awaiting_sale,
        })
      }

      if (servicesRes.data) setRecent(servicesRes.data as any)
      if (remindersRes.data) setReminders(remindersRes.data as any)
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header title="Dashboard" subtitle="Visão geral do dia" />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* Destaque: leads mais quentes — crédito aprovado aguardando fechamento */}
        {!!stats?.total_awaiting_sale && (
          <Link href="/atendimentos" className="block">
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 flex items-center gap-3 hover:bg-emerald-100/70 transition-colors">
              <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                <Clock className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-emerald-900">
                  {stats.total_awaiting_sale} {stats.total_awaiting_sale === 1 ? 'venda aprovada aguardando' : 'vendas aprovadas aguardando'} fechamento
                </p>
                <p className="text-xs text-emerald-700">Crédito já aprovado — o lead mais fácil de fechar. Cobre o vendedor.</p>
              </div>
              <ArrowRight className="h-5 w-5 text-emerald-500 shrink-0" />
            </div>
          </Link>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Entradas na loja" value={stats?.total_entries ?? '—'} icon={Users} iconColor="text-slate-600" iconBg="bg-slate-100" />
          <StatCard title="Atendidos" value={stats?.total_attended ?? '—'} icon={UserCheck} iconColor="text-indigo-600" iconBg="bg-indigo-50" />
          <StatCard title="Consultas realizadas" value={stats?.total_consultations ?? '—'} icon={FileSearch} iconColor="text-blue-600" iconBg="bg-blue-50" />
          <StatCard title="Aprovados" value={stats?.total_approved ?? '—'} icon={CheckCircle} iconColor="text-emerald-600" iconBg="bg-emerald-50" />
          <StatCard title="Aguardando fechamento" value={stats?.total_awaiting_sale ?? '—'} icon={Clock} iconColor="text-emerald-600" iconBg="bg-emerald-50" />
          <StatCard title="Com restrição/negado" value={stats?.total_restriction ?? '—'} icon={AlertTriangle} iconColor="text-amber-600" iconBg="bg-amber-50" />
          <StatCard title="Vendas fechadas" value={stats?.total_closed ?? '—'} icon={ShoppingBag} iconColor="text-emerald-600" iconBg="bg-emerald-50" />
          <StatCard title="Vendas perdidas" value={stats?.total_lost ?? '—'} icon={TrendingDown} iconColor="text-red-600" iconBg="bg-red-50" />
          <StatCard
            title="Reconsultas pendentes"
            value={stats?.total_pending_reminders ?? '—'}
            icon={Bell}
            iconColor="text-amber-600"
            iconBg="bg-amber-50"
          />
        </div>

        {/* Taxas de conversão */}
        {stats && (
          <Card>
            <CardHeader>
              <CardTitle>Taxas de conversão</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                {[
                  { label: 'Atendimento', value: pct(stats.total_attended, stats.total_entries) },
                  { label: 'Consulta', value: pct(stats.total_consultations, stats.total_attended) },
                  { label: 'Aprovação', value: pct(stats.total_approved, stats.total_consultations) },
                  { label: 'Fechamento', value: pct(stats.total_closed, stats.total_attended) },
                  { label: 'Perda c/ restrição', value: pct(stats.total_restriction, stats.total_consultations) },
                ].map((item) => (
                  <div key={item.label} className="text-center p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-2xl font-bold text-slate-900">{item.value}</p>
                    <p className="text-xs text-slate-500 mt-1">{item.label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recentes */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Últimos atendimentos</CardTitle>
                <Link href="/atendimentos" className="text-xs text-indigo-600 hover:underline font-medium">Ver todos →</Link>
              </div>
            </CardHeader>
            <div className="divide-y divide-slate-100">
              {loading ? (
                <div className="px-6 py-8 text-center text-sm text-slate-400">Carregando...</div>
              ) : recent.length === 0 ? (
                <div className="px-6 py-8 text-center text-sm text-slate-400">Nenhum atendimento ainda</div>
              ) : (
                recent.map((s) => (
                  <Link key={s.id} href={`/atendimentos/${s.id}`} className="flex items-center gap-3 px-6 py-3 hover:bg-slate-50 transition-colors">
                    <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-indigo-600">{s.name.charAt(0)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{s.name}</p>
                      <p className="text-xs text-slate-500">{maskCPF(s.cpf)} · {s.seller?.name ?? '—'}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      {s.status && (
                        <Badge variant={statusVariant(s.status)} className="text-xs">{s.status.description}</Badge>
                      )}
                      <p className="text-xs text-slate-400 mt-1">{formatDate(s.entry_date)}</p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </Card>

          {/* Lembretes */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Reconsultas próximas</CardTitle>
                <Link href="/lembretes" className="text-xs text-indigo-600 hover:underline font-medium">Ver todos →</Link>
              </div>
            </CardHeader>
            <div className="divide-y divide-slate-100">
              {loading ? (
                <div className="px-6 py-8 text-center text-sm text-slate-400">Carregando...</div>
              ) : reminders.length === 0 ? (
                <div className="px-6 py-8 text-center text-sm text-slate-400">Nenhuma reconsulta pendente</div>
              ) : (
                reminders.map((r) => (
                  <Link key={r.id} href={`/atendimentos/${r.customer_service?.id}`} className="flex items-center gap-3 px-6 py-3 hover:bg-slate-50 transition-colors">
                    <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                      <Bell className="h-4 w-4 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{r.customer_service?.name ?? '—'}</p>
                      <p className="text-xs text-slate-500">{r.seller?.name ?? '—'}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <Badge variant="warning">{formatDate(r.due_date)}</Badge>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

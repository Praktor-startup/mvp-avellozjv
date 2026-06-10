'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Bell, TrendingUp, ShoppingBag, XCircle, Users, CheckCircle, AlertTriangle, ArrowRight, Clock } from 'lucide-react'
import { formatDate, maskCPF } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
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
  customer_service: { id: string; name: string } | null
  seller: { name: string } | null
}

function pct(num: number, den: number) {
  if (!den) return 0
  return Math.round((num / den) * 100)
}

function statusVariant(s: RecentService['status']) {
  if (!s) return 'secondary' as const
  if (s.is_closed) return 'success' as const
  if (s.is_lost) return 'danger' as const
  if (s.generates_reminder) return 'warning' as const
  return 'default' as const
}

function isOverdue(dateStr: string) {
  return new Date(dateStr) < new Date()
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [recent, setRecent] = useState<RecentService[]>([])
  const [reminders, setReminders] = useState<UpcomingReminder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const [servicesRes, remindersRes, allRes, ccRes] = await Promise.all([
        supabase
          .from('customer_services')
          .select('id, name, cpf, entry_date, status:status_id(description,is_closed,is_lost,generates_reminder), seller:seller_id(name)')
          .order('entry_date', { ascending: false })
          .limit(6),
        supabase
          .from('reminders')
          .select('id, due_date, customer_service:customer_service_id(id,name), seller:seller_id(name)')
          .eq('status', 'pending')
          .order('due_date', { ascending: true })
          .limit(5),
        supabase
          .from('customer_services')
          .select('seller_id, reminder_active, statuses:status_id(is_closed,is_lost,generates_reminder,description)'),
        supabase.from('credit_checks').select('id, result'),
      ])

      if (allRes.data) {
        const data = allRes.data as any[]
        setStats({
          total_entries: data.length,
          total_attended: data.filter((d) => d.seller_id).length,
          total_closed: data.filter((d) => d.statuses?.is_closed).length,
          total_lost: data.filter((d) => d.statuses?.is_lost).length,
          total_pending_reminders: data.filter((d) => d.reminder_active).length,
          total_awaiting_sale: data.filter((d) => d.statuses?.description === 'Consulta aprovada').length,
          total_consultations: ccRes.data?.length ?? 0,
          total_approved: ccRes.data?.filter((c) => c.result === 'approved').length ?? 0,
          total_restriction: ccRes.data?.filter((c) => ['restriction', 'denied'].includes(c.result)).length ?? 0,
        })
      }

      if (servicesRes.data) setRecent(servicesRes.data as any)
      if (remindersRes.data) setReminders(remindersRes.data as any)
      setLoading(false)
    }
    load()
  }, [])

  const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="flex flex-col flex-1 overflow-y-auto bg-slate-50">

      {/* Header escuro com métricas principais */}
      <div className="bg-slate-900 text-white px-5 py-6 sm:px-8 sm:py-8">
        <div className="max-w-6xl mx-auto">
          <p className="text-slate-400 text-xs font-medium capitalize mb-1">{today}</p>
          <h1 className="text-xl sm:text-2xl font-black mb-6">Dashboard</h1>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {[
              {
                label: 'Vendas fechadas',
                value: stats?.total_closed ?? '—',
                icon: ShoppingBag,
                color: 'text-emerald-400',
                bg: 'bg-emerald-400/10',
                border: 'border-emerald-400/20',
              },
              {
                label: 'Aprovações',
                value: stats?.total_approved ?? '—',
                icon: CheckCircle,
                color: 'text-indigo-400',
                bg: 'bg-indigo-400/10',
                border: 'border-indigo-400/20',
              },
              {
                label: 'Reconsultas pendentes',
                value: stats?.total_pending_reminders ?? '—',
                icon: Bell,
                color: 'text-amber-400',
                bg: 'bg-amber-400/10',
                border: 'border-amber-400/20',
              },
              {
                label: 'Entradas na loja',
                value: stats?.total_entries ?? '—',
                icon: Users,
                color: 'text-slate-300',
                bg: 'bg-white/5',
                border: 'border-white/10',
              },
            ].map(({ label, value, icon: Icon, color, bg, border }) => (
              <div key={label} className={`rounded-xl border ${border} ${bg} p-4`}>
                <Icon className={`w-4 h-4 ${color} mb-2`} />
                <p className="text-2xl sm:text-3xl font-black text-white tabular-nums">{value}</p>
                <p className="text-xs text-slate-400 mt-1 leading-tight">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto w-full px-5 sm:px-8 py-6 space-y-6">

        {/* Destaque: crédito aprovado aguardando fechamento — o lead mais quente */}
        {!!stats?.total_awaiting_sale && (
          <Link href="/atendimentos" className="block">
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 sm:p-5 flex items-center gap-3 hover:bg-emerald-100/70 transition-colors">
              <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                <Clock className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-emerald-900">
                  {stats.total_awaiting_sale} {stats.total_awaiting_sale === 1 ? 'venda aprovada aguardando' : 'vendas aprovadas aguardando'} fechamento
                </p>
                <p className="text-xs text-emerald-700 mt-0.5">Crédito já aprovado — o lead mais fácil de fechar. Cobre o vendedor.</p>
              </div>
              <ArrowRight className="h-5 w-5 text-emerald-500 shrink-0" />
            </div>
          </Link>
        )}

        {/* Funil de conversão */}
        {stats && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-bold text-slate-900 text-base">Funil de conversão</h2>
                <p className="text-xs text-slate-400 mt-0.5">Fluxo completo do atendimento</p>
              </div>
              <TrendingUp className="w-4 h-4 text-slate-300" />
            </div>

            <div className="space-y-3">
              {[
                { label: 'Entradas na loja', value: stats.total_entries, max: stats.total_entries, color: 'bg-slate-700' },
                { label: 'Atendidos por vendedor', value: stats.total_attended, max: stats.total_entries, color: 'bg-indigo-500' },
                { label: 'Consultas de crédito', value: stats.total_consultations, max: stats.total_entries, color: 'bg-blue-500' },
                { label: 'Aprovados', value: stats.total_approved, max: stats.total_entries, color: 'bg-emerald-500' },
                { label: 'Vendas fechadas', value: stats.total_closed, max: stats.total_entries, color: 'bg-emerald-600' },
              ].map(({ label, value, max, color }) => {
                const p = max ? Math.max(4, Math.round((value / max) * 100)) : 0
                return (
                  <div key={label} className="flex items-center gap-3">
                    <p className="text-xs text-slate-500 w-36 sm:w-44 shrink-0 truncate">{label}</p>
                    <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${color}`}
                        style={{ width: `${p}%` }}
                      />
                    </div>
                    <p className="text-sm font-bold text-slate-900 tabular-nums w-6 text-right shrink-0">{value}</p>
                    <p className="text-xs text-slate-400 w-8 shrink-0 text-right">
                      {pct(value, stats.total_entries)}%
                    </p>
                  </div>
                )
              })}
            </div>

            {/* Taxas em destaque */}
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-6 pt-5 border-t border-slate-100">
              {[
                { label: 'Atendimento', value: pct(stats.total_attended, stats.total_entries) },
                { label: 'Consulta', value: pct(stats.total_consultations, stats.total_attended) },
                { label: 'Aprovação', value: pct(stats.total_approved, stats.total_consultations) },
                { label: 'Fechamento', value: pct(stats.total_closed, stats.total_approved) },
                { label: 'Perda', value: pct(stats.total_lost, stats.total_entries) },
              ].map(({ label, value }) => (
                <div key={label} className="text-center">
                  <p className={`text-xl sm:text-2xl font-black tabular-nums ${value >= 50 ? 'text-emerald-600' : value >= 25 ? 'text-amber-600' : 'text-slate-900'}`}>
                    {value}%
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Reconsultas urgentes */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Bell className="w-3.5 h-3.5 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Reconsultas pendentes</h2>
                  {stats && stats.total_pending_reminders > 0 && (
                    <p className="text-xs text-amber-600 font-medium">{stats.total_pending_reminders} aguardando</p>
                  )}
                </div>
              </div>
              <Link href="/lembretes" className="text-xs text-indigo-600 font-semibold flex items-center gap-0.5 hover:underline">
                Ver todos <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {loading ? (
              <div className="py-10 text-center text-sm text-slate-400">Carregando...</div>
            ) : reminders.length === 0 ? (
              <div className="py-10 text-center">
                <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-600">Nenhuma reconsulta pendente</p>
                <p className="text-xs text-slate-400 mt-0.5">Tudo em dia</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {reminders.map((r) => {
                  const overdue = isOverdue(r.due_date)
                  return (
                    <Link
                      key={r.id}
                      href={`/atendimentos/${r.customer_service?.id}`}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors"
                    >
                      <div className={`w-2 h-2 rounded-full shrink-0 ${overdue ? 'bg-red-500' : 'bg-amber-400'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{r.customer_service?.name ?? '—'}</p>
                        <p className="text-xs text-slate-400">{r.seller?.name ?? '—'}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className={`text-xs font-bold ${overdue ? 'text-red-600' : 'text-amber-600'}`}>
                          {overdue ? 'Vencida' : formatDate(r.due_date)}
                        </p>
                        {!overdue && <p className="text-[10px] text-slate-400">{formatDate(r.due_date)}</p>}
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          {/* Últimos atendimentos */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <Users className="w-3.5 h-3.5 text-indigo-600" />
                </div>
                <h2 className="text-sm font-bold text-slate-900">Últimos atendimentos</h2>
              </div>
              <Link href="/atendimentos" className="text-xs text-indigo-600 font-semibold flex items-center gap-0.5 hover:underline">
                Ver todos <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {loading ? (
              <div className="py-10 text-center text-sm text-slate-400">Carregando...</div>
            ) : recent.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-400">Nenhum atendimento ainda</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recent.map((s) => (
                  <Link
                    key={s.id}
                    href={`/atendimentos/${s.id}`}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                      <span className="text-xs font-black text-indigo-600">{s.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{s.name}</p>
                      <p className="text-xs text-slate-400 truncate">{s.seller?.name ?? '—'} · {formatDate(s.entry_date)}</p>
                    </div>
                    <div className="shrink-0">
                      {s.status && <Badge variant={statusVariant(s.status)} className="text-xs">{s.status.description}</Badge>}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Perda vs restrição */}
        {stats && stats.total_restriction > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-amber-900 text-sm">
                  {stats.total_restriction} cliente{stats.total_restriction !== 1 ? 's' : ''} com restrição ou negação
                </p>
                <p className="text-xs text-amber-700 mt-0.5">
                  {pct(stats.total_restriction, stats.total_consultations)}% das consultas — acompanhe as reconsultas para recuperar essas oportunidades.
                </p>
              </div>
              <Link
                href="/lembretes"
                className="shrink-0 text-xs font-bold text-amber-800 bg-amber-200 hover:bg-amber-300 px-3 py-1.5 rounded-lg transition-colors"
              >
                Ver reconsultas
              </Link>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

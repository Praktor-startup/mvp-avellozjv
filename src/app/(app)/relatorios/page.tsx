'use client'

import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/ui/stat-card'
import { Badge } from '@/components/ui/badge'
import { SellerRankingChart, EvolutionChart } from '@/components/reports/monthly-charts'
import { cn, monthRange } from '@/lib/utils'
import { Users, CheckCircle, ShoppingBag, TrendingDown, FileSearch, Bell } from 'lucide-react'

interface SellerStats {
  id: string
  name: string
  total_attended: number
  total_consultations: number
  total_approved: number
  total_restriction: number
  total_closed: number
  total_lost: number
  total_reminders: number
}

type PresetKey = 'current_month' | 'last_30' | 'last_6_months' | 'custom'

const PRESETS: { key: PresetKey; label: string }[] = [
  { key: 'current_month', label: 'Este mês' },
  { key: 'last_30', label: 'Últimos 30 dias' },
  { key: 'last_6_months', label: 'Últimos 6 meses' },
  { key: 'custom', label: 'Personalizado' },
]

function pct(num: number, den: number) {
  if (!den) return '—'
  return `${Math.round((num / den) * 100)}%`
}

function toDateInputValue(d: Date) {
  return d.toISOString().slice(0, 10)
}

function startOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

// Fim exclusivo: dia seguinte à meia-noite, para incluir o dia informado por inteiro.
function endExclusive(d: Date) {
  const x = startOfDay(d)
  x.setDate(x.getDate() + 1)
  return x
}

function presetRange(preset: PresetKey, customStart: string, customEnd: string) {
  const now = new Date()
  if (preset === 'current_month') {
    const { start, end } = monthRange(now.getFullYear(), now.getMonth() + 1)
    return { start, end }
  }
  if (preset === 'last_30') {
    const start = startOfDay(now)
    start.setDate(start.getDate() - 29)
    return { start: start.toISOString(), end: endExclusive(now).toISOString() }
  }
  if (preset === 'last_6_months') {
    const start = startOfDay(now)
    start.setMonth(start.getMonth() - 6)
    return { start: start.toISOString(), end: endExclusive(now).toISOString() }
  }
  // custom
  const start = customStart ? startOfDay(new Date(customStart + 'T00:00:00')) : startOfDay(now)
  const end = customEnd ? endExclusive(new Date(customEnd + 'T00:00:00')) : endExclusive(now)
  return { start: start.toISOString(), end: end.toISOString() }
}

function periodLabel(preset: PresetKey, start: string, end: string) {
  const fmt = (iso: string) => format(new Date(iso), 'dd/MM/yyyy', { locale: ptBR })
  const endInclusive = new Date(new Date(end).getTime() - 1)
  if (preset === 'current_month') {
    return format(new Date(start), "MMMM 'de' yyyy", { locale: ptBR })
  }
  return `${fmt(start)} até ${fmt(endInclusive.toISOString())}`
}

// Períodos longos (ex: 6 meses) viram ilegíveis com um ponto por dia — agrupa por mês nesse caso.
function buildBuckets(startISO: string, endISO: string) {
  const start = new Date(startISO)
  const end = new Date(endISO)
  const spanDays = Math.round((end.getTime() - start.getTime()) / 86400000)

  if (spanDays <= 45) {
    const buckets: { key: string; label: string; entradas: number; fechamentos: number }[] = []
    for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
      buckets.push({ key: d.toISOString().slice(0, 10), label: format(d, 'dd/MM'), entradas: 0, fechamentos: 0 })
    }
    return { buckets, keyOf: (iso: string) => iso.slice(0, 10) }
  }

  const buckets: { key: string; label: string; entradas: number; fechamentos: number }[] = []
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1)
  while (cursor < end) {
    buckets.push({
      key: `${cursor.getFullYear()}-${cursor.getMonth()}`,
      label: format(cursor, 'MMM/yy', { locale: ptBR }),
      entradas: 0,
      fechamentos: 0,
    })
    cursor.setMonth(cursor.getMonth() + 1)
  }
  return {
    buckets,
    keyOf: (iso: string) => {
      const d = new Date(iso)
      return `${d.getFullYear()}-${d.getMonth()}`
    },
  }
}

export default function RelatoriosPage() {
  const [preset, setPreset] = useState<PresetKey>('current_month')
  const [customStart, setCustomStart] = useState(toDateInputValue(new Date(new Date().getFullYear(), new Date().getMonth(), 1)))
  const [customEnd, setCustomEnd] = useState(toDateInputValue(new Date()))
  const [stats, setStats] = useState<SellerStats[]>([])
  const [totals, setTotals] = useState({ entries: 0, closed: 0, approved: 0 })
  const [dailyData, setDailyData] = useState<{ label: string; entradas: number; fechamentos: number }[]>([])
  const [loading, setLoading] = useState(true)

  const { start: rangeStart, end: rangeEnd } = useMemo(
    () => presetRange(preset, customStart, customEnd),
    [preset, customStart, customEnd]
  )

  useEffect(() => {
    async function load() {
      setLoading(true)
      const supabase = createClient()

      // RLS escopa automaticamente: gestor/técnico vê a loja toda, vendedor só o próprio.
      const [sellersRes, entriesRes, closedRes, checksRes, remindersRes] = await Promise.all([
        supabase.from('sellers').select('id, name').order('name'),
        supabase
          .from('customer_services')
          .select('id, seller_id, entry_date, status:status_id(is_lost)')
          .gte('entry_date', rangeStart)
          .lt('entry_date', rangeEnd),
        supabase
          .from('customer_services')
          .select('id, seller_id, closed_at')
          .gte('closed_at', rangeStart)
          .lt('closed_at', rangeEnd),
        supabase
          .from('credit_checks')
          .select('id, customer_service_id, result, check_date, customer_service:customer_service_id(seller_id)')
          .gte('check_date', rangeStart)
          .lt('check_date', rangeEnd),
        supabase.from('reminders').select('id, seller_id, status').eq('status', 'pending'),
      ])

      const sellers = (sellersRes.data ?? []) as { id: string; name: string }[]
      const entries = (entriesRes.data ?? []) as any[]
      const closed = (closedRes.data ?? []) as any[]
      const checks = (checksRes.data ?? []) as any[]
      const reminders = (remindersRes.data ?? []) as any[]

      const result: SellerStats[] = sellers
        .map((seller) => {
          const sellerEntries = entries.filter((e) => e.seller_id === seller.id)
          const sellerClosed = closed.filter((c) => c.seller_id === seller.id)
          const sellerChecks = checks.filter((c) => c.customer_service?.seller_id === seller.id)
          const sellerReminders = reminders.filter((r) => r.seller_id === seller.id)

          return {
            id: seller.id,
            name: seller.name,
            total_attended: sellerEntries.length,
            total_consultations: sellerChecks.length,
            total_approved: sellerChecks.filter((c) => c.result === 'approved').length,
            total_restriction: sellerChecks.filter((c) => ['restriction', 'denied'].includes(c.result)).length,
            total_closed: sellerClosed.length,
            total_lost: sellerEntries.filter((e) => e.status?.is_lost).length,
            total_reminders: sellerReminders.length,
          }
        })
        .sort((a, b) => b.total_closed - a.total_closed)

      setStats(result)
      setTotals({
        entries: entries.length,
        closed: closed.length,
        approved: checks.filter((c) => c.result === 'approved').length,
      })

      const { buckets, keyOf } = buildBuckets(rangeStart, rangeEnd)
      const byKey = new Map(buckets.map((b) => [b.key, b]))
      entries.forEach((e) => {
        const b = byKey.get(keyOf(e.entry_date))
        if (b) b.entradas += 1
      })
      closed.forEach((c) => {
        const b = byKey.get(keyOf(c.closed_at))
        if (b) b.fechamentos += 1
      })
      setDailyData(buckets)

      setLoading(false)
    }
    load()
  }, [rangeStart, rangeEnd])

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header title="Relatório" subtitle={`Período: ${periodLabel(preset, rangeStart, rangeEnd)}`} />
      <div className="flex-1 overflow-y-auto p-6 space-y-5">

        {/* Filtros de período */}
        <div className="flex flex-wrap items-center gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPreset(p.key)}
              className={cn(
                'h-9 px-3.5 rounded-lg text-sm font-medium border transition-colors',
                preset === p.key
                  ? 'bg-brand-600 border-brand-600 text-white'
                  : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
              )}
            >
              {p.label}
            </button>
          ))}
          {preset === 'custom' && (
            <div className="flex items-center gap-2 ml-1">
              <input
                type="date"
                value={customStart}
                max={customEnd}
                onChange={(e) => setCustomStart(e.target.value)}
                className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
              <span className="text-sm text-slate-400">até</span>
              <input
                type="date"
                value={customEnd}
                min={customStart}
                max={toDateInputValue(new Date())}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-center text-slate-400 py-12">Carregando...</div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard title="Entradas na loja" value={totals.entries} icon={Users} iconColor="text-slate-600" iconBg="bg-slate-100" />
              <StatCard title="Aprovações" value={totals.approved} icon={CheckCircle} iconColor="text-brand-600" iconBg="bg-brand-50" />
              <StatCard title="Vendas fechadas" value={totals.closed} icon={ShoppingBag} iconColor="text-emerald-600" iconBg="bg-emerald-50" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <SellerRankingChart data={stats.map((s) => ({ name: s.name, total_closed: s.total_closed }))} />
              <EvolutionChart data={dailyData} />
            </div>

            {stats.length === 0 ? (
              <div className="text-center text-slate-400 py-12">Nenhum vendedor cadastrado</div>
            ) : (
              <>
                <p className="text-xs text-slate-400 -mb-1">
                  A Taxa de consulta pode passar de 100% quando o mesmo cliente tem mais de uma consulta de crédito no
                  período (ex: reconsulta após restrição) — ela conta consultas, não clientes distintos.
                </p>
                {stats.map((s, i) => (
                <Card key={s.id}>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-brand-100 flex items-center justify-center">
                        <span className="text-sm font-bold text-brand-600">{i + 1}º</span>
                      </div>
                      <CardTitle>{s.name}</CardTitle>
                      {s.total_reminders > 0 && (
                        <Badge variant="warning">
                          <Bell className="h-3 w-3" />
                          {s.total_reminders} reconsulta{s.total_reminders !== 1 ? 's' : ''} pendente{s.total_reminders !== 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                      {[
                        { label: 'Atendidos', value: s.total_attended, icon: Users, color: 'text-slate-600' },
                        { label: 'Consultas', value: s.total_consultations, icon: FileSearch, color: 'text-blue-600' },
                        { label: 'Aprovados', value: s.total_approved, icon: CheckCircle, color: 'text-emerald-600' },
                        { label: 'Restrição', value: s.total_restriction, icon: TrendingDown, color: 'text-amber-600' },
                        { label: 'Fechados', value: s.total_closed, icon: ShoppingBag, color: 'text-emerald-700' },
                        { label: 'Perdidos', value: s.total_lost, icon: TrendingDown, color: 'text-red-600' },
                      ].map((item) => (
                        <div key={item.label} className="text-center p-3 rounded-xl bg-slate-50 border border-slate-100">
                          <p className={`text-xl font-bold ${item.color}`}>{item.value}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{item.label}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: 'Taxa consulta', value: pct(s.total_consultations, s.total_attended) },
                        { label: 'Taxa aprovação', value: pct(s.total_approved, s.total_consultations) },
                        { label: 'Taxa fechamento', value: pct(s.total_closed, s.total_attended) },
                        { label: 'Perda c/ restrição', value: pct(s.total_restriction, s.total_consultations) },
                      ].map((item) => (
                        <div key={item.label} className="px-4 py-3 rounded-xl bg-white border border-slate-100 text-center">
                          <p className="text-lg font-bold text-slate-900">{item.value}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{item.label}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

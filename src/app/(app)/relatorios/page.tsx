'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/ui/stat-card'
import { Badge } from '@/components/ui/badge'
import { SellerRankingChart, DailyEvolutionChart } from '@/components/reports/monthly-charts'
import { monthRange, monthLabel } from '@/lib/utils'
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

function pct(num: number, den: number) {
  if (!den) return '—'
  return `${Math.round((num / den) * 100)}%`
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate()
}

export default function RelatoriosPage() {
  const now = new Date()
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)
  const [stats, setStats] = useState<SellerStats[]>([])
  const [totals, setTotals] = useState({ entries: 0, closed: 0, approved: 0 })
  const [dailyData, setDailyData] = useState<{ day: number; entradas: number; fechamentos: number }[]>([])
  const [loading, setLoading] = useState(true)

  const { start: monthStart, end: monthEnd } = useMemo(
    () => monthRange(selectedYear, selectedMonth),
    [selectedYear, selectedMonth]
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
          .gte('entry_date', monthStart)
          .lt('entry_date', monthEnd),
        supabase
          .from('customer_services')
          .select('id, seller_id, closed_at')
          .gte('closed_at', monthStart)
          .lt('closed_at', monthEnd),
        supabase
          .from('credit_checks')
          .select('id, customer_service_id, result, check_date, customer_service:customer_service_id(seller_id)')
          .gte('check_date', monthStart)
          .lt('check_date', monthEnd),
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

      const days = daysInMonth(selectedYear, selectedMonth)
      const daily = Array.from({ length: days }, (_, i) => ({ day: i + 1, entradas: 0, fechamentos: 0 }))
      entries.forEach((e) => {
        const d = new Date(e.entry_date).getDate()
        if (daily[d - 1]) daily[d - 1].entradas += 1
      })
      closed.forEach((c) => {
        const d = new Date(c.closed_at).getDate()
        if (daily[d - 1]) daily[d - 1].fechamentos += 1
      })
      setDailyData(daily)

      setLoading(false)
    }
    load()
  }, [monthStart, monthEnd, selectedYear, selectedMonth])

  const monthInputValue = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`

  function handleMonthChange(value: string) {
    const [y, m] = value.split('-').map(Number)
    if (!y || !m) return
    setSelectedYear(y)
    setSelectedMonth(m)
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header
        title="Relatórios Mensais"
        subtitle={`Desempenho de ${monthLabel(selectedYear, selectedMonth)}`}
        actions={
          <input
            type="month"
            value={monthInputValue}
            max={`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`}
            onChange={(e) => handleMonthChange(e.target.value)}
            className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        }
      />
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
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
              <DailyEvolutionChart data={dailyData} />
            </div>

            {stats.length === 0 ? (
              <div className="text-center text-slate-400 py-12">Nenhum vendedor cadastrado</div>
            ) : (
              stats.map((s, i) => (
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
              ))
            )}
          </>
        )}
      </div>
    </div>
  )
}

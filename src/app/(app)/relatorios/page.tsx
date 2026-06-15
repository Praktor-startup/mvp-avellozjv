'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, FileSearch, CheckCircle, ShoppingBag, TrendingDown, Bell } from 'lucide-react'

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

export default function RelatoriosPage() {
  const [stats, setStats] = useState<SellerStats[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()

      const [sellersRes, servicesRes, checksRes, remindersRes] = await Promise.all([
        supabase.from('sellers').select('id, name').eq('active', true).order('name'),
        supabase.from('customer_services').select('id, seller_id, status:status_id(is_closed,is_lost,generates_reminder)'),
        supabase.from('credit_checks').select('id, customer_service_id, result'),
        supabase.from('reminders').select('id, seller_id, status').eq('status', 'pending'),
      ])

      const sellers = (sellersRes.data ?? []) as { id: string; name: string }[]
      const services = (servicesRes.data ?? []) as any[]
      const checks = (checksRes.data ?? []) as any[]
      const reminders = (remindersRes.data ?? []) as any[]

      const serviceMap = new Map<string, string[]>()
      services.forEach((s) => {
        if (!s.seller_id) return
        if (!serviceMap.has(s.seller_id)) serviceMap.set(s.seller_id, [])
        serviceMap.get(s.seller_id)!.push(s.id)
      })

      const result: SellerStats[] = sellers.map((seller) => {
        const sellerServices = services.filter((s) => s.seller_id === seller.id)
        const serviceIds = sellerServices.map((s) => s.id)
        const sellerChecks = checks.filter((c) => serviceIds.includes(c.customer_service_id))
        const sellerReminders = reminders.filter((r) => r.seller_id === seller.id)

        return {
          id: seller.id,
          name: seller.name,
          total_attended: sellerServices.length,
          total_consultations: sellerChecks.length,
          total_approved: sellerChecks.filter((c) => c.result === 'approved').length,
          total_restriction: sellerChecks.filter((c) => ['restriction', 'denied'].includes(c.result)).length,
          total_closed: sellerServices.filter((s) => s.status?.is_closed).length,
          total_lost: sellerServices.filter((s) => s.status?.is_lost).length,
          total_reminders: sellerReminders.length,
        }
      })

      setStats(result)
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header title="Relatórios" subtitle="Desempenho por vendedor" />
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {loading ? (
          <div className="text-center text-slate-400 py-12">Carregando...</div>
        ) : stats.length === 0 ? (
          <div className="text-center text-slate-400 py-12">Nenhum vendedor cadastrado</div>
        ) : (
          stats.map((s) => (
            <Card key={s.id}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-brand-100 flex items-center justify-center">
                    <span className="text-sm font-bold text-brand-600">{s.name.charAt(0)}</span>
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
      </div>
    </div>
  )
}

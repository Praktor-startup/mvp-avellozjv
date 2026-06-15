'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { formatDate, maskCPF, cn, reminderTypeLabel, whatsappHref } from '@/lib/utils'
import { Bell, CheckCheck, AlertTriangle, MessageCircle, ShoppingBag, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { isAfter, parseISO, isToday } from 'date-fns'

interface ReminderRow {
  id: string
  due_date: string
  status: string
  type: string
  customer_service: { id: string; name: string; cpf: string; phone: string | null } | null
  seller: { name: string; whatsapp: string } | null
}

function dueVariant(due: string, status: string) {
  if (status === 'completed') return 'success' as const
  if (isToday(parseISO(due))) return 'warning' as const
  if (isAfter(new Date(), parseISO(due))) return 'danger' as const
  return 'default' as const
}

function dueLabel(due: string, status: string) {
  if (status === 'completed') return 'Concluído'
  if (isToday(parseISO(due))) return 'Hoje'
  if (isAfter(new Date(), parseISO(due))) return 'Vencido'
  return formatDate(due)
}

export default function LembretesPage() {
  const [reminders, setReminders] = useState<ReminderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase
        .from('reminders')
        .select('id, due_date, status, type, customer_service:customer_service_id(id,name,cpf,phone), seller:seller_id(name,whatsapp)')
        .order('due_date', { ascending: true })
      setReminders((data ?? []) as unknown as ReminderRow[])
      setLoading(false)
    }
    load()
  }, [])

  async function markDone(reminderId: string) {
    setCompleting(reminderId)
    const supabase = createClient()
    await supabase.from('reminders').update({ status: 'completed' }).eq('id', reminderId)
    setReminders((prev) => prev.map((r) => r.id === reminderId ? { ...r, status: 'completed' } : r))
    setCompleting(null)
  }

  const pending = reminders.filter((r) => r.status !== 'completed')
  const done = reminders.filter((r) => r.status === 'completed')

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header
        title="Lembretes"
        subtitle={`${pending.length} pendente${pending.length !== 1 ? 's' : ''}`}
      />
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {loading ? (
          <div className="text-center text-slate-400 py-12">Carregando...</div>
        ) : (
          <>
            {pending.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-slate-700">Pendentes</h2>
                {pending.map((r) => {
                  const variant = dueVariant(r.due_date, r.status)
                  const isFollowup = r.type === 'sale_followup'
                  const phone = r.customer_service?.phone
                  return (
                    <Card key={r.id} className={cn('border-l-4', isFollowup ? 'border-l-emerald-400' : variant === 'danger' ? 'border-l-red-400' : variant === 'warning' ? 'border-l-amber-400' : 'border-l-brand-300')}>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 px-5 py-4">
                        <div className={cn('h-9 w-9 rounded-xl flex items-center justify-center shrink-0',
                          isFollowup ? 'bg-emerald-100' : variant === 'danger' ? 'bg-red-100' : variant === 'warning' ? 'bg-amber-100' : 'bg-brand-100'
                        )}>
                          {isFollowup
                            ? <ShoppingBag className="h-4 w-4 text-emerald-600" />
                            : variant === 'danger'
                              ? <AlertTriangle className="h-4 w-4 text-red-600" />
                              : <Bell className="h-4 w-4 text-amber-600" />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Link href={`/atendimentos/${r.customer_service?.id}`} className="font-medium text-slate-900 hover:text-brand-600 text-sm">
                              {r.customer_service?.name ?? '—'}
                            </Link>
                            <Badge variant={isFollowup ? 'success' : 'default'} className="text-xs">{reminderTypeLabel(r.type)}</Badge>
                            <Badge variant={variant}>{dueLabel(r.due_date, r.status)}</Badge>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            CPF: {maskCPF(r.customer_service?.cpf ?? '')} · Vendedor: {r.seller?.name ?? '—'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {phone && (
                            <a href={whatsappHref(phone)} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 transition-colors">
                              <MessageCircle className="h-4 w-4" />
                              WhatsApp
                            </a>
                          )}
                          <Link href={`/atendimentos/${r.customer_service?.id}`}>
                            <Button variant="outline" size="sm">
                              <ArrowRight className="h-4 w-4" />
                              {isFollowup ? 'Registrar venda' : 'Registrar resultado'}
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            loading={completing === r.id}
                            onClick={() => markDone(r.id)}
                          >
                            <CheckCheck className="h-4 w-4" />
                            Concluir
                          </Button>
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}

            {done.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-slate-400">Concluídos</h2>
                {done.map((r) => (
                  <Card key={r.id} className="opacity-60">
                    <div className="flex items-center gap-4 px-5 py-4">
                      <div className="h-9 w-9 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                        <CheckCheck className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-slate-700 text-sm line-through">{r.customer_service?.name ?? '—'}</p>
                        <p className="text-xs text-slate-400">{r.seller?.name ?? '—'} · {formatDate(r.due_date)}</p>
                      </div>
                      <Badge variant="success">Concluído</Badge>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {reminders.length === 0 && (
              <div className="text-center py-16">
                <Bell className="h-12 w-12 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-400 font-medium">Nenhum lembrete cadastrado</p>
                <p className="text-sm text-slate-400 mt-1">Lembretes são criados automaticamente em restrição/negação de crédito e em crédito aprovado aguardando fechamento</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

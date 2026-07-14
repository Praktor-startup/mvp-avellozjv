'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  formatDate, formatDateTime, formatCPF, formatPhone, whatsappHref,
  creditResultLabel, creditResultColor, nextConsultationDate, saleFollowupDate, cn,
} from '@/lib/utils'
import {
  ArrowLeft, Edit, Plus, Bell, Upload, FileText, CheckCircle, AlertTriangle,
  MessageCircle, ShoppingBag, XCircle,
} from 'lucide-react'
import Link from 'next/link'
import type { CustomerService, CreditCheck, Status, LossReason } from '@/types'

const SERVICE_SELECT = `*, seller:seller_id(*), motorcycle_type:motorcycle_type_id(*), status:status_id(*), loss_reason:loss_reason_id(*), channel:channel_id(*)`

export default function AtendimentoDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [service, setService] = useState<CustomerService | null>(null)
  const [checks, setChecks] = useState<CreditCheck[]>([])
  const [statuses, setStatuses] = useState<Status[]>([])
  const [lossReasons, setLossReasons] = useState<LossReason[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddCheck, setShowAddCheck] = useState(false)
  const [addingCheck, setAddingCheck] = useState(false)
  const [showLost, setShowLost] = useState(false)
  const [lostReasonId, setLostReasonId] = useState('')
  const [savingOutcome, setSavingOutcome] = useState<string | null>(null)

  const [checkForm, setCheckForm] = useState({ check_date: '', result: '', notes: '', sale_outcome: 'pending', loss_reason_id: '' })
  const [checkFile, setCheckFile] = useState<File | null>(null)
  const [checkErrors, setCheckErrors] = useState<Record<string, string>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  const reload = useCallback(async () => {
    const supabase = createClient()
    const [svc, chk] = await Promise.all([
      supabase.from('customer_services').select(SERVICE_SELECT).eq('id', id).single(),
      supabase.from('credit_checks').select('*').eq('customer_service_id', id).order('check_date', { ascending: false }),
    ])
    if (svc.data) setService(svc.data as CustomerService)
    if (chk.data) setChecks(chk.data as CreditCheck[])
  }, [id])

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const [svc, chk, st, lr] = await Promise.all([
        supabase.from('customer_services').select(SERVICE_SELECT).eq('id', id).single(),
        supabase.from('credit_checks').select('*').eq('customer_service_id', id).order('check_date', { ascending: false }),
        supabase.from('statuses').select('*').eq('active', true).order('sort_order'),
        supabase.from('loss_reasons').select('*').eq('active', true).order('description'),
      ])
      if (svc.data) setService(svc.data as CustomerService)
      if (chk.data) setChecks(chk.data as CreditCheck[])
      setStatuses((st.data ?? []) as Status[])
      setLossReasons((lr.data ?? []) as LossReason[])
      setLoading(false)
    }
    load()
  }, [id])

  // Encerra lembretes de cobrança de fechamento ainda pendentes deste atendimento
  async function completeSaleFollowups() {
    const supabase = createClient()
    await supabase.from('reminders').update({ status: 'completed' })
      .eq('customer_service_id', id).eq('type', 'sale_followup').eq('status', 'pending')
  }

  // Conclui reconsultas pendentes — registrar uma nova consulta cumpre o lembrete,
  // então o cliente sai da lista "Reconsultas pendentes" do dashboard.
  async function completeReconsultations() {
    const supabase = createClient()
    await supabase.from('reminders').update({ status: 'completed' })
      .eq('customer_service_id', id).eq('type', 'reconsultation').eq('status', 'pending')
  }

  // Conclui lembretes de "cobrar resultado" de consulta pendente — quando o
  // resultado definitivo chega, não precisa mais cobrar.
  async function completePendingChecks() {
    const supabase = createClient()
    await supabase.from('reminders').update({ status: 'completed' })
      .eq('customer_service_id', id).eq('type', 'pending_check').eq('status', 'pending')
  }

  async function applyOutcome(kind: 'closed' | 'lost', lossReasonId?: string) {
    setSavingOutcome(kind)
    const supabase = createClient()
    const target = kind === 'closed'
      ? statuses.find((s) => s.is_closed)
      : statuses.find((s) => s.is_lost && !s.generates_reminder)
    if (!target) { setSavingOutcome(null); return }
    // Venda fechada/perdida encerra o ciclo: limpa reconsulta pendente e a flag
    await supabase.from('customer_services').update({
      status_id: target.id,
      loss_reason_id: kind === 'lost' ? (lossReasonId ?? null) : null,
      reminder_active: false,
      next_consultation_date: null,
      closed_at: kind === 'closed' ? new Date().toISOString() : null,
    }).eq('id', id)
    await Promise.all([completeSaleFollowups(), completeReconsultations(), completePendingChecks()])
    await reload()
    setShowLost(false)
    setLostReasonId('')
    setSavingOutcome(null)
  }

  async function handleAddCheck(e: React.FormEvent) {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!checkForm.check_date) errs.check_date = 'Obrigatório'
    if (!checkForm.result) errs.result = 'Obrigatório'
    if (checkForm.result === 'approved' && checkForm.sale_outcome === 'lost' && !checkForm.loss_reason_id) {
      errs.loss_reason_id = 'Informe o motivo'
    }
    if (Object.keys(errs).length) { setCheckErrors(errs); return }

    setAddingCheck(true)
    const supabase = createClient()

    let file_url: string | null = null
    let file_name: string | null = null

    if (checkFile) {
      const ext = checkFile.name.split('.').pop()
      const path = `credit-checks/${id}/${Date.now()}.${ext}`
      const { data } = await supabase.storage.from('avelloz').upload(path, checkFile)
      if (data) {
        const { data: urlData } = supabase.storage.from('avelloz').getPublicUrl(path)
        file_url = urlData.publicUrl
        file_name = checkFile.name
      }
    }

    // Lembrete de reconsulta é gerado pelo resultado restrição/negado
    const generatesReconsult = ['restriction', 'denied'].includes(checkForm.result)
    const nextDate = generatesReconsult ? nextConsultationDate(checkForm.check_date) : null

    const { data: newCheck } = await supabase
      .from('credit_checks')
      .insert({
        customer_service_id: id,
        check_date: checkForm.check_date,
        result: checkForm.result,
        notes: checkForm.notes || null,
        file_url,
        file_name,
        next_check_date: nextDate,
      })
      .select()
      .single()

    // Registrar uma consulta definitiva (aprovado/restrição/negado) cumpre os
    // lembretes pendentes — o cliente sai do dashboard de reconsultas/cobranças.
    const definitive = ['approved', 'restriction', 'denied'].includes(checkForm.result)
    if (definitive) await Promise.all([completeReconsultations(), completePendingChecks()])

    if (nextDate) {
      // nova restrição/negação → reabre o ciclo com uma nova reconsulta
      await Promise.all([
        supabase.from('customer_services').update({
          reminder_active: true,
          next_consultation_date: nextDate,
        }).eq('id', id),
        supabase.from('reminders').insert({
          customer_service_id: id,
          credit_check_id: newCheck?.id ?? null,
          seller_id: service?.seller_id ?? null,
          due_date: nextDate,
          type: 'reconsultation',
          status: 'pending',
        }),
      ])
    } else if (definitive) {
      // aprovado → não há mais reconsulta pendente; limpa a flag e a data
      await supabase.from('customer_services').update({
        reminder_active: false,
        next_consultation_date: null,
      }).eq('id', id)
    } else if (checkForm.result === 'pending') {
      // consulta no banco aguardando resultado → cobra o retorno em 2 dias
      const dueDate = saleFollowupDate(checkForm.check_date, 2)
      if (dueDate) {
        await supabase.from('reminders').insert({
          customer_service_id: id,
          credit_check_id: newCheck?.id ?? null,
          seller_id: service?.seller_id ?? null,
          due_date: dueDate,
          type: 'pending_check',
          status: 'pending',
        })
      }
    }

    // Consulta aprovada: define o estado da venda já aqui no detalhe
    if (checkForm.result === 'approved') {
      if (checkForm.sale_outcome === 'closed') {
        const closed = statuses.find((s) => s.is_closed)
        if (closed) await supabase.from('customer_services').update({ status_id: closed.id, loss_reason_id: null, closed_at: new Date().toISOString() }).eq('id', id)
        await completeSaleFollowups()
      } else if (checkForm.sale_outcome === 'lost') {
        const lost = statuses.find((s) => s.is_lost && !s.generates_reminder)
        if (lost) await supabase.from('customer_services').update({ status_id: lost.id, loss_reason_id: checkForm.loss_reason_id || null }).eq('id', id)
        await completeSaleFollowups()
      } else {
        // aguardando fechamento — vira "Consulta aprovada" + lembrete de cobrança
        const approved = statuses.find((s) => s.description === 'Consulta aprovada')
        if (approved) await supabase.from('customer_services').update({ status_id: approved.id }).eq('id', id)
        const followupDate = saleFollowupDate(checkForm.check_date)
        if (followupDate) {
          await supabase.from('reminders').insert({
            customer_service_id: id,
            credit_check_id: newCheck?.id ?? null,
            seller_id: service?.seller_id ?? null,
            due_date: followupDate,
            type: 'sale_followup',
            status: 'pending',
          })
        }
      }
    }

    setCheckForm({ check_date: '', result: '', notes: '', sale_outcome: 'pending', loss_reason_id: '' })
    setCheckFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    setShowAddCheck(false)
    setAddingCheck(false)
    await reload()
  }

  if (loading) {
    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header title="Atendimento" />
        <div className="flex-1 flex items-center justify-center text-slate-400">Carregando...</div>
      </div>
    )
  }

  if (!service) {
    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header title="Atendimento" />
        <div className="flex-1 flex items-center justify-center text-slate-400">Atendimento não encontrado</div>
      </div>
    )
  }

  const status = service.status as Status | null
  const isAwaitingSale = status?.description === 'Consulta aprovada'
  const isClosed = !!status?.is_closed
  const isLost = !!status?.is_lost
  const customerWa = service.phone
    ? whatsappHref(service.phone, `Olá ${service.name.split(' ')[0]}, tudo bem? Aqui é da Avelloz.`)
    : null

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header
        title={service.name}
        subtitle={`CPF: ${formatCPF(service.cpf)}`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
            <Link href={`/atendimentos/${id}/editar`}>
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4" />
                Editar
              </Button>
            </Link>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-5">

        {/* Desfecho da venda — crédito aprovado aguardando fechamento */}
        {isAwaitingSale && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                  <h3 className="text-sm font-semibold text-emerald-900">Crédito aprovado — aguardando fechamento</h3>
                </div>
                <p className="text-sm text-emerald-700 mt-1">
                  Esse é o lead mais quente. A moto foi vendida?
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button size="sm" loading={savingOutcome === 'closed'} onClick={() => applyOutcome('closed')} className="bg-emerald-600 hover:bg-emerald-700">
                  <ShoppingBag className="h-4 w-4" />
                  Moto vendida
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowLost(true)}>
                  <XCircle className="h-4 w-4" />
                  Não vendeu
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          <div className="lg:col-span-2 space-y-5">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Dados do atendimento</CardTitle>
                  {status && (
                    <Badge variant={status.is_closed ? 'success' : status.is_lost ? 'danger' : status.generates_reminder ? 'warning' : 'default'}>
                      {status?.description ?? '—'}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
                  {[
                    { label: 'Nome', value: service.name },
                    { label: 'CPF', value: formatCPF(service.cpf) },
                    { label: 'Telefone', value: formatPhone(service.phone) },
                    { label: 'Entrada', value: formatDateTime(service.entry_date) },
                    { label: 'Vendedor', value: service.seller?.name ?? '—' },
                    { label: 'Moto de interesse', value: service.motorcycle_type?.model ?? '—' },
                    { label: 'Motivo da perda', value: service.loss_reason?.description ?? '—' },
                    { label: 'Canal de origem', value: service.channel?.description ?? '—' },
                  ].map((item) => (
                    <div key={item.label}>
                      <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">{item.label}</dt>
                      <dd className="mt-1 text-sm font-medium text-slate-900">{item.value}</dd>
                    </div>
                  ))}
                </dl>
                {service.notes && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Observações</dt>
                    <dd className="text-sm text-slate-700">{service.notes}</dd>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Histórico de consultas ({checks.length})</CardTitle>
                  <Button size="sm" variant="outline" onClick={() => setShowAddCheck(true)}>
                    <Plus className="h-4 w-4" />
                    Nova consulta
                  </Button>
                </div>
              </CardHeader>
              <div className="divide-y divide-slate-100">
                {checks.length === 0 ? (
                  <div className="px-6 py-8 text-center text-sm text-slate-400">Nenhuma consulta registrada</div>
                ) : (
                  checks.map((c) => (
                    <div key={c.id} className="px-6 py-4 flex items-start gap-4">
                      <div className={cn('h-8 w-8 rounded-full flex items-center justify-center shrink-0',
                        c.result === 'approved' ? 'bg-emerald-100' : c.result === 'restriction' ? 'bg-amber-100' : 'bg-red-100'
                      )}>
                        {c.result === 'approved'
                          ? <CheckCircle className="h-4 w-4 text-emerald-600" />
                          : <AlertTriangle className="h-4 w-4 text-amber-600" />
                        }
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border', creditResultColor(c.result))}>
                            {creditResultLabel(c.result)}
                          </span>
                          <span className="text-xs text-slate-500">{formatDate(c.check_date)}</span>
                        </div>
                        {c.notes && <p className="text-sm text-slate-600 mt-1">{c.notes}</p>}
                        {c.next_check_date && (
                          <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                            <Bell className="h-3 w-3" />
                            Próxima consulta: {formatDate(c.next_check_date)}
                          </p>
                        )}
                        {c.file_url && (
                          <a href={c.file_url} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline mt-1">
                            <FileText className="h-3 w-3" />
                            {c.file_name ?? 'Ver arquivo'}
                          </a>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>

          <div className="space-y-4">
            {/* Contato */}
            <Card>
              <CardHeader><CardTitle className="text-sm">Contato</CardTitle></CardHeader>
              <CardContent className="pt-0 space-y-2">
                {customerWa ? (
                  <a href={customerWa} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full h-9 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors">
                    <MessageCircle className="h-4 w-4" />
                    WhatsApp do cliente
                  </a>
                ) : (
                  <p className="text-xs text-slate-400">Sem telefone do cliente. <Link href={`/atendimentos/${id}/editar`} className="text-brand-600 underline">Adicionar</Link></p>
                )}
                {service.seller?.whatsapp && (
                  <a href={whatsappHref(service.seller.whatsapp)} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full h-9 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors">
                    <MessageCircle className="h-4 w-4 text-emerald-600" />
                    Vendedor: {service.seller.name}
                  </a>
                )}
              </CardContent>
            </Card>

            {/* Ações rápidas */}
            {!isClosed && !isLost && (
              <Card>
                <CardHeader><CardTitle className="text-sm">Ações rápidas</CardTitle></CardHeader>
                <CardContent className="pt-0 space-y-2">
                  <Button variant="outline" size="sm" className="w-full justify-start" loading={savingOutcome === 'closed'} onClick={() => applyOutcome('closed')}>
                    <ShoppingBag className="h-4 w-4 text-emerald-600" />
                    Marcar venda fechada
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => setShowLost(true)}>
                    <XCircle className="h-4 w-4 text-red-500" />
                    Marcar venda perdida
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => setShowAddCheck(true)}>
                    <Plus className="h-4 w-4 text-brand-600" />
                    Registrar reconsulta
                  </Button>
                </CardContent>
              </Card>
            )}

            {service.reminder_active && service.next_consultation_date && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Bell className="h-4 w-4 text-amber-600" />
                  <span className="text-sm font-semibold text-amber-800">Reconsulta pendente</span>
                </div>
                <p className="text-xs text-amber-700">
                  Data prevista: <strong>{formatDate(service.next_consultation_date)}</strong>
                </p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Vendedor: <strong>{service.seller?.name ?? '—'}</strong>
                </p>
              </div>
            )}

            <Card>
              <CardContent className="pt-4 space-y-3">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Cadastrado em</p>
                  <p className="text-sm text-slate-800 mt-0.5">{formatDateTime(service.created_at)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Atualizado em</p>
                  <p className="text-sm text-slate-800 mt-0.5">{formatDateTime(service.updated_at)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Consultas realizadas</p>
                  <p className="text-sm text-slate-800 mt-0.5">{checks.length}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Modal: nova consulta */}
      <Modal open={showAddCheck} onClose={() => setShowAddCheck(false)} title="Nova consulta de crédito" size="md">
        <form onSubmit={handleAddCheck} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Data da consulta"
              type="date"
              required
              value={checkForm.check_date}
              onChange={(e) => setCheckForm((f) => ({ ...f, check_date: e.target.value }))}
              error={checkErrors.check_date}
            />
            <Select
              label="Resultado"
              required
              value={checkForm.result}
              onChange={(e) => setCheckForm((f) => ({ ...f, result: e.target.value }))}
              placeholder="Selecione"
              options={[
                { value: 'approved', label: 'Aprovado' },
                { value: 'restriction', label: 'Restrição' },
                { value: 'denied', label: 'Negado' },
                { value: 'pending', label: 'Pendente' },
              ]}
              error={checkErrors.result}
            />
          </div>

          {/* Aprovado: define a situação da venda em vez de só registrar */}
          {checkForm.result === 'approved' && (
            <div className="space-y-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
              <Select
                label="Situação da venda"
                required
                value={checkForm.sale_outcome}
                onChange={(e) => setCheckForm((f) => ({ ...f, sale_outcome: e.target.value }))}
                options={[
                  { value: 'pending', label: 'Aguardando fechamento (decidir depois)' },
                  { value: 'closed', label: 'Já fechou a venda' },
                  { value: 'lost', label: 'Não fechou' },
                ]}
              />
              {checkForm.sale_outcome === 'pending' && checkForm.check_date && saleFollowupDate(checkForm.check_date) && (
                <p className="text-xs text-emerald-700">
                  Lembrete de cobrança será criado para{' '}
                  <strong>{new Date(saleFollowupDate(checkForm.check_date)! + 'T12:00:00').toLocaleDateString('pt-BR')}</strong>.
                </p>
              )}
              {checkForm.sale_outcome === 'lost' && (
                <Select
                  label="Motivo da perda"
                  required
                  value={checkForm.loss_reason_id}
                  onChange={(e) => setCheckForm((f) => ({ ...f, loss_reason_id: e.target.value }))}
                  placeholder="Por que não fechou?"
                  options={lossReasons.map((l) => ({ value: l.id, label: l.description }))}
                  error={checkErrors.loss_reason_id}
                />
              )}
            </div>
          )}

          <Textarea
            label="Observações"
            value={checkForm.notes}
            onChange={(e) => setCheckForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="Informações adicionais..."
          />
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1.5">
              Arquivo da consulta
            </label>
            <label className="flex items-center gap-3 px-4 py-3 rounded-lg border-2 border-dashed border-slate-200 hover:border-brand-300 cursor-pointer transition-colors">
              <Upload className="h-4 w-4 text-slate-400" />
              <span className="text-sm text-slate-500">
                {checkFile ? checkFile.name : 'Clique para selecionar (JPG, PNG, PDF, WEBP)'}
              </span>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".jpg,.jpeg,.png,.pdf,.webp"
                onChange={(e) => setCheckFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
          {['restriction', 'denied'].includes(checkForm.result) && checkForm.check_date && nextConsultationDate(checkForm.check_date) && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
              <Bell className="h-4 w-4 text-amber-600 shrink-0" />
              <p className="text-xs text-amber-700">
                Lembrete de reconsulta para <strong>{new Date(nextConsultationDate(checkForm.check_date)! + 'T12:00:00').toLocaleDateString('pt-BR')}</strong> será criado automaticamente.
              </p>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowAddCheck(false)}>Cancelar</Button>
            <Button type="submit" loading={addingCheck}>Salvar consulta</Button>
          </div>
        </form>
      </Modal>

      {/* Modal: marcar venda perdida (motivo obrigatório) */}
      <Modal open={showLost} onClose={() => setShowLost(false)} title="Venda não fechou" size="sm">
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-600">Qual o motivo da perda?</p>
          <Select
            label="Motivo da perda"
            required
            value={lostReasonId}
            onChange={(e) => setLostReasonId(e.target.value)}
            placeholder="Selecione o motivo"
            options={lossReasons.map((l) => ({ value: l.id, label: l.description }))}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowLost(false)}>Cancelar</Button>
            <Button
              variant="danger"
              loading={savingOutcome === 'lost'}
              disabled={!lostReasonId}
              onClick={() => applyOutcome('lost', lostReasonId)}
            >
              Confirmar perda
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

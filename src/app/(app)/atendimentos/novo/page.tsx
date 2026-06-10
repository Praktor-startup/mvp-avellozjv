'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCPF, nextConsultationDate, saleFollowupDate, validateCPF } from '@/lib/utils'
import { ArrowLeft, AlertTriangle, CheckCircle2, Bell } from 'lucide-react'
import type { Seller, Status, MotorcycleType, LossReason } from '@/types'

const REQUIRES_CREDIT_STATUSES = ['Consulta com restrição', 'Financiamento negado']
const REQUIRES_SALE_FOLLOWUP = ['Consulta aprovada']
const GENERATES_REMINDER = ['Consulta com restrição', 'Financiamento negado']
const REQUIRES_LOSS_REASON = ['Venda perdida']

const today = () => new Date().toISOString().slice(0, 10)

export default function NovoAtendimentoPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [sellers, setSellers] = useState<Seller[]>([])
  const [statuses, setStatuses] = useState<Status[]>([])
  const [motos, setMotos] = useState<MotorcycleType[]>([])
  const [lossReasons, setLossReasons] = useState<LossReason[]>([])
  const [cpfWarning, setCpfWarning] = useState<string | null>(null)
  const [existingId, setExistingId] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: '',
    cpf: '',
    phone: '',
    entry_date: new Date().toISOString().slice(0, 16),
    seller_id: '',
    motorcycle_type_id: '',
    status_id: '',
    loss_reason_id: '',
    notes: '',
    // consulta de crédito (restrição/negado)
    check_date: '',
    check_result: '',
    check_notes: '',
    // consulta aprovada
    approval_date: today(),
    // desfecho da venda aprovada: pending (padrão) | closed | lost
    sale_outcome: 'pending',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    async function loadMeta() {
      const supabase = createClient()
      const [s, st, m, lr] = await Promise.all([
        supabase.from('sellers').select('*').eq('active', true).order('name'),
        supabase.from('statuses').select('*').eq('active', true).order('sort_order'),
        supabase.from('motorcycle_types').select('*').eq('active', true).order('model'),
        supabase.from('loss_reasons').select('*').eq('active', true).order('description'),
      ])
      setSellers((s.data ?? []) as Seller[])
      setStatuses((st.data ?? []) as Status[])
      setMotos((m.data ?? []) as MotorcycleType[])
      setLossReasons((lr.data ?? []) as LossReason[])
    }
    loadMeta()
  }, [])

  const selectedStatus = statuses.find((s) => s.id === form.status_id)
  const requiresCredit = selectedStatus && REQUIRES_CREDIT_STATUSES.includes(selectedStatus.description)
  const requiresSaleFollowup = selectedStatus && REQUIRES_SALE_FOLLOWUP.includes(selectedStatus.description)
  const requiresLoss = selectedStatus && REQUIRES_LOSS_REASON.includes(selectedStatus.description)
  // motivo de perda quando a consulta foi aprovada mas a venda não fechou
  const lostOnApproval = requiresSaleFollowup && form.sale_outcome === 'lost'

  async function checkCPF(cpf: string) {
    const clean = cpf.replace(/\D/g, '')
    if (clean.length !== 11) return
    const supabase = createClient()
    const { data } = await supabase
      .from('customer_services')
      .select('id, name')
      .eq('cpf', clean)
      .limit(1)
    if (data && data.length > 0) {
      setCpfWarning(`CPF já cadastrado: ${data[0].name}`)
      setExistingId(data[0].id)
    } else {
      setCpfWarning(null)
      setExistingId(null)
    }
  }

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
    if (errors[key]) setErrors((e) => { const n = { ...e }; delete n[key]; return n })
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = 'Nome obrigatório'
    const cleanCPF = form.cpf.replace(/\D/g, '')
    if (!validateCPF(cleanCPF)) e.cpf = 'CPF inválido'
    if (!form.seller_id) e.seller_id = 'Vendedor obrigatório'
    if (!form.status_id) e.status_id = 'Status obrigatório'
    if (requiresCredit) {
      if (!form.check_date) e.check_date = 'Data da consulta obrigatória'
      if (!form.check_result) e.check_result = 'Resultado da consulta obrigatório'
    }
    if (requiresSaleFollowup) {
      if (!form.approval_date) e.approval_date = 'Data da aprovação obrigatória'
      if (form.sale_outcome === 'lost' && !form.loss_reason_id) e.loss_reason_id = 'Motivo da perda obrigatório'
    }
    if (requiresLoss && !form.loss_reason_id) e.loss_reason_id = 'Motivo da perda obrigatório'
    return e
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    setLoading(true)
    const supabase = createClient()

    const generatesReminder = selectedStatus && GENERATES_REMINDER.includes(selectedStatus.description)
    const nextDate = generatesReminder && form.check_date ? nextConsultationDate(form.check_date) : null

    // Resolve status/motivo finais conforme o desfecho da venda aprovada
    let finalStatusId = form.status_id
    let finalLossReasonId: string | null = requiresLoss ? (form.loss_reason_id || null) : null

    if (requiresSaleFollowup) {
      if (form.sale_outcome === 'closed') {
        const closedStatus = statuses.find((s) => s.is_closed)
        if (closedStatus) finalStatusId = closedStatus.id
      } else if (form.sale_outcome === 'lost') {
        const lostStatus = statuses.find((s) => s.is_lost && !s.generates_reminder)
        if (lostStatus) finalStatusId = lostStatus.id
        finalLossReasonId = form.loss_reason_id || null
      }
      // 'pending' mantém "Consulta aprovada" como estado de aguardando fechamento
    }

    const { data: service, error } = await supabase
      .from('customer_services')
      .insert({
        name: form.name.trim(),
        cpf: form.cpf.replace(/\D/g, ''),
        phone: form.phone.replace(/\D/g, '') || null,
        entry_date: form.entry_date,
        seller_id: form.seller_id || null,
        motorcycle_type_id: form.motorcycle_type_id || null,
        status_id: finalStatusId || null,
        loss_reason_id: finalLossReasonId,
        notes: form.notes || null,
        reminder_active: !!nextDate,
        next_consultation_date: nextDate,
      })
      .select()
      .single()

    if (error || !service) {
      setErrors({ _: 'Erro ao salvar atendimento. Tente novamente.' })
      setLoading(false)
      return
    }

    // Consulta de crédito (restrição/negado) + lembrete de reconsulta
    if (requiresCredit && form.check_date && form.check_result) {
      await supabase.from('credit_checks').insert({
        customer_service_id: service.id,
        check_date: form.check_date,
        result: form.check_result,
        notes: form.check_notes || null,
        next_check_date: nextDate,
      })

      if (generatesReminder && nextDate) {
        await supabase.from('reminders').insert({
          customer_service_id: service.id,
          seller_id: form.seller_id || null,
          due_date: nextDate,
          type: 'reconsultation',
          status: 'pending',
        })
      }
    }

    // Consulta aprovada: registra a consulta e, se ainda não fechou,
    // cria lembrete de cobrança de fechamento (o lead mais quente).
    if (requiresSaleFollowup) {
      await supabase.from('credit_checks').insert({
        customer_service_id: service.id,
        check_date: form.approval_date,
        result: 'approved',
        notes: form.check_notes || null,
      })

      if (form.sale_outcome === 'pending') {
        await supabase.from('reminders').insert({
          customer_service_id: service.id,
          seller_id: form.seller_id || null,
          due_date: saleFollowupDate(form.approval_date),
          type: 'sale_followup',
          status: 'pending',
        })
      }
    }

    router.push(`/atendimentos/${service.id}`)
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header
        title="Novo Atendimento"
        actions={
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        }
      />
      <div className="flex-1 overflow-y-auto p-6">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-6">

          {errors._ && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
              <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
              <p className="text-sm text-red-700">{errors._}</p>
            </div>
          )}

          <Card>
            <CardHeader><CardTitle>Dados do cliente</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Nome completo"
                  required
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  error={errors.name}
                  placeholder="Nome do cliente"
                />
                <div>
                  <Input
                    label="CPF"
                    required
                    value={form.cpf}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, '').slice(0, 11)
                      const masked = v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
                      set('cpf', masked)
                    }}
                    onBlur={() => checkCPF(form.cpf)}
                    error={errors.cpf}
                    placeholder="000.000.000-00"
                  />
                  {cpfWarning && (
                    <div className="mt-2 flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200">
                      <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                      <div className="text-xs text-amber-700">
                        <p className="font-medium">{cpfWarning}</p>
                        <button type="button" onClick={() => router.push(`/atendimentos/${existingId}`)} className="underline mt-0.5">
                          Ver atendimento existente
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Telefone / WhatsApp"
                  value={form.phone}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, '').slice(0, 11)
                    const masked = v.length > 10
                      ? v.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
                      : v.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3')
                    set('phone', masked)
                  }}
                  placeholder="(00) 00000-0000"
                  hint="Para contato e recuperação do cliente"
                />
                <Input
                  label="Data de entrada"
                  type="datetime-local"
                  required
                  value={form.entry_date}
                  onChange={(e) => set('entry_date', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Vendedor responsável"
                  required
                  value={form.seller_id}
                  onChange={(e) => set('seller_id', e.target.value)}
                  placeholder="Selecione o vendedor"
                  options={sellers.map((s) => ({ value: s.id, label: s.name }))}
                  error={errors.seller_id}
                />
                <Select
                  label="Tipo de moto"
                  value={form.motorcycle_type_id}
                  onChange={(e) => set('motorcycle_type_id', e.target.value)}
                  placeholder="Selecione o modelo"
                  options={motos.map((m) => ({ value: m.id, label: m.model }))}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Status atual"
                  required
                  value={form.status_id}
                  onChange={(e) => set('status_id', e.target.value)}
                  placeholder="Selecione o status"
                  options={statuses.map((s) => ({ value: s.id, label: s.description }))}
                  error={errors.status_id}
                />
                {requiresLoss && (
                  <Select
                    label="Motivo da perda"
                    required
                    value={form.loss_reason_id}
                    onChange={(e) => set('loss_reason_id', e.target.value)}
                    placeholder="Selecione o motivo"
                    options={lossReasons.map((l) => ({ value: l.id, label: l.description }))}
                    error={errors.loss_reason_id}
                  />
                )}
              </div>
              <Textarea
                label="Observações"
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
                placeholder="Informações adicionais sobre o atendimento..."
              />
            </CardContent>
          </Card>

          {/* Consulta aprovada — desfecho da venda NÃO é forçado */}
          {requiresSaleFollowup && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <CardTitle>Crédito aprovado</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  label="Data da aprovação"
                  type="date"
                  required
                  value={form.approval_date}
                  onChange={(e) => set('approval_date', e.target.value)}
                  error={errors.approval_date}
                />
                <Select
                  label="Situação da venda"
                  required
                  value={form.sale_outcome}
                  onChange={(e) => set('sale_outcome', e.target.value)}
                  options={[
                    { value: 'pending', label: 'Aguardando fechamento (decidir depois)' },
                    { value: 'closed', label: 'Já fechou a venda agora' },
                    { value: 'lost', label: 'Não fechou' },
                  ]}
                />
                {form.sale_outcome === 'pending' && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                    <Bell className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-700">
                      Vai entrar como <strong>aprovado aguardando fechamento</strong> — o lead mais quente.
                      Um lembrete de cobrança será criado para{' '}
                      <strong>{new Date(saleFollowupDate(form.approval_date) + 'T12:00:00').toLocaleDateString('pt-BR')}</strong>.
                    </p>
                  </div>
                )}
                {form.sale_outcome === 'closed' && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <p className="text-sm text-emerald-700">
                      Será salvo como <strong>Venda fechada</strong>.
                    </p>
                  </div>
                )}
                {lostOnApproval && (
                  <Select
                    label="Motivo da perda"
                    required
                    value={form.loss_reason_id}
                    onChange={(e) => set('loss_reason_id', e.target.value)}
                    placeholder="Por que a venda não fechou?"
                    options={lossReasons.map((l) => ({ value: l.id, label: l.description }))}
                    error={errors.loss_reason_id}
                  />
                )}
              </CardContent>
            </Card>
          )}

          {/* Consulta de crédito (restrição ou negado) */}
          {requiresCredit && (
            <Card>
              <CardHeader><CardTitle>Consulta de crédito</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Data da consulta"
                    type="date"
                    required
                    value={form.check_date}
                    onChange={(e) => set('check_date', e.target.value)}
                    error={errors.check_date}
                  />
                  <Select
                    label="Resultado"
                    required
                    value={form.check_result}
                    onChange={(e) => set('check_result', e.target.value)}
                    placeholder="Selecione o resultado"
                    options={[
                      { value: 'restriction', label: 'Restrição' },
                      { value: 'denied', label: 'Negado' },
                      { value: 'pending', label: 'Pendente' },
                    ]}
                    error={errors.check_result}
                  />
                </div>
                <Textarea
                  label="Observações da consulta"
                  value={form.check_notes}
                  onChange={(e) => set('check_notes', e.target.value)}
                  placeholder="Detalhes da consulta..."
                />
                {GENERATES_REMINDER.includes(selectedStatus?.description ?? '') && form.check_date && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                    <p className="text-sm text-amber-700">
                      Lembrete de reconsulta será criado automaticamente para{' '}
                      <strong>{new Date(nextConsultationDate(form.check_date) + 'T12:00:00').toLocaleDateString('pt-BR')}</strong>
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
            <Button type="submit" loading={loading}>Salvar atendimento</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

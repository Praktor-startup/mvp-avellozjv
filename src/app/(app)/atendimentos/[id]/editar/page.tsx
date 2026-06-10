'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCPF, formatPhone } from '@/lib/utils'
import { ArrowLeft, AlertTriangle } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import type { Seller, Status, MotorcycleType, LossReason } from '@/types'

const REQUIRES_LOSS_REASON = ['Venda perdida']

export default function EditarAtendimentoPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [sellers, setSellers] = useState<Seller[]>([])
  const [statuses, setStatuses] = useState<Status[]>([])
  const [motos, setMotos] = useState<MotorcycleType[]>([])
  const [lossReasons, setLossReasons] = useState<LossReason[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [originalStatus, setOriginalStatus] = useState<string>('')

  const [form, setForm] = useState({
    name: '', cpf: '', phone: '', entry_date: '', seller_id: '',
    motorcycle_type_id: '', status_id: '', loss_reason_id: '', notes: '',
  })

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const [svc, s, st, m, lr] = await Promise.all([
        supabase.from('customer_services').select('*').eq('id', id).single(),
        supabase.from('sellers').select('*').eq('active', true).order('name'),
        supabase.from('statuses').select('*').eq('active', true).order('sort_order'),
        supabase.from('motorcycle_types').select('*').eq('active', true).order('model'),
        supabase.from('loss_reasons').select('*').eq('active', true).order('description'),
      ])
      if (svc.data) {
        const d = svc.data as any
        let entryDate = ''
        try {
          entryDate = format(parseISO(d.entry_date), "yyyy-MM-dd'T'HH:mm")
        } catch {
          entryDate = d.entry_date?.slice(0, 16) ?? ''
        }
        // Aplica máscara no telefone ao carregar (banco guarda dígitos puros)
        const rawPhone = d.phone ?? ''
        const maskedPhone = rawPhone ? formatPhone(rawPhone) : ''
        setForm({
          name: d.name ?? '',
          cpf: d.cpf ?? '',
          phone: maskedPhone,
          entry_date: entryDate,
          seller_id: d.seller_id ?? '',
          motorcycle_type_id: d.motorcycle_type_id ?? '',
          status_id: d.status_id ?? '',
          loss_reason_id: d.loss_reason_id ?? '',
          notes: d.notes ?? '',
        })
        setOriginalStatus(d.status_id ?? '')
      }
      setSellers((s.data ?? []) as Seller[])
      setStatuses((st.data ?? []) as Status[])
      setMotos((m.data ?? []) as MotorcycleType[])
      setLossReasons((lr.data ?? []) as LossReason[])
      setFetching(false)
    }
    load()
  }, [id])

  const selectedStatus = statuses.find((s) => s.id === form.status_id)
  const originalStatusObj = statuses.find((s) => s.id === originalStatus)
  const requiresLoss = selectedStatus && REQUIRES_LOSS_REASON.includes(selectedStatus.description)

  // Avisa se está tentando reverter uma venda fechada
  const isRevertingClosed = originalStatusObj?.is_closed && !selectedStatus?.is_closed

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
    if (errors[key]) setErrors((e) => { const n = { ...e }; delete n[key]; return n })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!form.name.trim()) errs.name = 'Nome obrigatório'
    if (!form.seller_id) errs.seller_id = 'Vendedor obrigatório'
    if (!form.status_id) errs.status_id = 'Status obrigatório'
    if (requiresLoss && !form.loss_reason_id) errs.loss_reason_id = 'Motivo da perda obrigatório'
    if (Object.keys(errs).length) { setErrors(errs); return }

    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.from('customer_services').update({
      name: form.name.trim(),
      phone: form.phone.replace(/\D/g, '') || null,
      entry_date: form.entry_date,
      seller_id: form.seller_id || null,
      motorcycle_type_id: form.motorcycle_type_id || null,
      status_id: form.status_id || null,
      loss_reason_id: requiresLoss ? (form.loss_reason_id || null) : null,
      notes: form.notes || null,
    }).eq('id', id)

    if (error) {
      setErrors({ _: 'Erro ao salvar. Tente novamente.' })
      setLoading(false)
      return
    }

    router.push(`/atendimentos/${id}`)
  }

  if (fetching) return <div className="flex flex-col flex-1 items-center justify-center text-slate-400">Carregando...</div>

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header
        title="Editar Atendimento"
        actions={
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />Voltar
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

          {isRevertingClosed && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-700">
                <strong>Atenção:</strong> você está alterando um atendimento com status <strong>Venda fechada</strong>. Confirme que esta alteração é intencional.
              </p>
            </div>
          )}

          <Card>
            <CardHeader><CardTitle>Dados do atendimento</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Nome completo" required value={form.name} onChange={(e) => set('name', e.target.value)} error={errors.name} />
                <Input label="CPF" value={formatCPF(form.cpf)} disabled hint="CPF não pode ser alterado" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Telefone / WhatsApp"
                  value={form.phone}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, '').slice(0, 11)
                    let masked = v
                    if (v.length > 10) {
                      masked = v.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
                    } else if (v.length > 6) {
                      masked = v.replace(/(\d{2})(\d{4})(\d{1,4})/, '($1) $2-$3')
                    } else if (v.length > 2) {
                      masked = v.replace(/(\d{2})(\d{1,4})/, '($1) $2')
                    } else if (v.length > 0) {
                      masked = `(${v}`
                    }
                    set('phone', masked)
                  }}
                  placeholder="(00) 00000-0000"
                  hint="Para contato e recuperação do cliente"
                />
                <Input label="Data de entrada" type="datetime-local" required value={form.entry_date} onChange={(e) => set('entry_date', e.target.value)} />
                <Select label="Vendedor responsável" required value={form.seller_id} onChange={(e) => set('seller_id', e.target.value)}
                  placeholder="Selecione" options={sellers.map((s) => ({ value: s.id, label: s.name }))} error={errors.seller_id} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select label="Tipo de moto" value={form.motorcycle_type_id} onChange={(e) => set('motorcycle_type_id', e.target.value)}
                  placeholder="Selecione" options={motos.map((m) => ({ value: m.id, label: m.model }))} />
                <Select label="Status atual" required value={form.status_id} onChange={(e) => set('status_id', e.target.value)}
                  placeholder="Selecione" options={statuses.map((s) => ({ value: s.id, label: s.description }))} error={errors.status_id} />
              </div>
              {requiresLoss && (
                <Select label="Motivo da perda" required value={form.loss_reason_id} onChange={(e) => set('loss_reason_id', e.target.value)}
                  placeholder="Selecione" options={lossReasons.map((l) => ({ value: l.id, label: l.description }))} error={errors.loss_reason_id} />
              )}
              <Textarea label="Observações" value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Informações adicionais..." />
            </CardContent>
          </Card>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
            <Button type="submit" loading={loading}>Salvar alterações</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

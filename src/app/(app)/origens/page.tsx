'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import QRCode from 'qrcode'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Modal } from '@/components/ui/modal'
import { Badge } from '@/components/ui/badge'
import { formatWhatsApp } from '@/lib/utils'
import {
  Plus, QrCode, ScanLine, Users, Download, Copy, Check, Power,
  Bike, ChevronDown, ChevronUp, ArrowRight,
} from 'lucide-react'

interface Source {
  id: string
  name: string
  code: string
  kind: string
  description: string | null
  active: boolean
}

type LeadStatus = 'novo' | 'contatado' | 'convertido' | 'descartado'

interface SourceLead {
  id: string
  name: string
  phone: string
  status: LeadStatus
  source_id: string | null
  converted_service_id: string | null
  service: { status: { description: string; is_closed: boolean } | null } | null
}

const LEAD_STATUS_META: Record<LeadStatus, { label: string; variant: 'default' | 'success' | 'warning' | 'secondary' | 'danger' }> = {
  novo: { label: 'Novo', variant: 'warning' },
  contatado: { label: 'Contatado', variant: 'default' },
  convertido: { label: 'Convertido', variant: 'success' },
  descartado: { label: 'Descartado', variant: 'secondary' },
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 32)
}

export default function OrigensPage() {
  const router = useRouter()
  const [sources, setSources] = useState<Source[]>([])
  const [scanCount, setScanCount] = useState<Record<string, number>>({})
  const [leadCount, setLeadCount] = useState<Record<string, number>>({})
  const [salesCount, setSalesCount] = useState<Record<string, number>>({})
  const [leadsBySource, setLeadsBySource] = useState<Record<string, SourceLead[]>>({})
  const [expanded, setExpanded] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', description: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [qrSource, setQrSource] = useState<Source | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [copiedCard, setCopiedCard] = useState<string | null>(null)

  const load = useCallback(async () => {
    const supabase = createClient()
    const [srcRes, scansRes, leadsRes] = await Promise.all([
      supabase.from('lead_sources').select('*').order('created_at', { ascending: false }),
      supabase.from('scans').select('source_id'),
      supabase
        .from('leads')
        .select('id, name, phone, status, source_id, converted_service_id, service:converted_service_id(status:status_id(description, is_closed))')
        .order('created_at', { ascending: false }),
    ])
    setSources((srcRes.data ?? []) as Source[])
    const sc: Record<string, number> = {}
    ;(scansRes.data ?? []).forEach((r: { source_id: string }) => { sc[r.source_id] = (sc[r.source_id] ?? 0) + 1 })
    setScanCount(sc)

    const leadsData = (leadsRes.data ?? []) as unknown as SourceLead[]
    const lc: Record<string, number> = {}
    const lbs: Record<string, SourceLead[]> = {}
    const sales: Record<string, number> = {}
    leadsData.forEach((l) => {
      if (!l.source_id) return
      lc[l.source_id] = (lc[l.source_id] ?? 0) + 1
      ;(lbs[l.source_id] ??= []).push(l)
      if (l.service?.status?.is_closed) sales[l.source_id] = (sales[l.source_id] ?? 0) + 1
    })
    setLeadCount(lc)
    setLeadsBySource(lbs)
    setSalesCount(sales)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function openAdd() { setForm({ name: '', description: '' }); setErrors({}); setShowModal(true) }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setErrors({ name: 'Nome obrigatório' }); return }
    setSaving(true)
    const supabase = createClient()

    // Causa nº1 de falha: sessão expirada numa aba aberta há horas. Valida o
    // login contra o servidor antes de tentar gravar.
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      setSaving(false)
      setErrors({ name: 'Sua sessão expirou. Clique em "Sair" e entre novamente para criar a origem.' })
      return
    }
    // Garante o vínculo com a loja (org_id usa o default current_org()).
    try { await supabase.rpc('ensure_org') } catch {}

    // code único: slug do nome + sufixo curto aleatório
    const base = slugify(form.name) || 'origem'
    const code = `${base}-${Math.random().toString(36).slice(2, 6)}`
    const { error } = await supabase.from('lead_sources').insert({
      name: form.name.trim(),
      code,
      kind: 'qr',
      description: form.description.trim() || null,
    })
    setSaving(false)
    if (error) {
      console.error('Erro ao criar origem:', error)
      const m = `${error.message || ''} ${(error as { code?: string }).code || ''}`
      let msg: string
      if (/duplicate|unique|23505/i.test(m)) msg = 'Já existe uma origem com esse nome. Tente outro.'
      else if (/jwt|expired|401|invalid token|not authenticated/i.test(m)) msg = 'Sua sessão expirou. Saia e entre novamente.'
      else if (/row-level security|42501|\borg\b/i.test(m)) msg = 'Sua conta ainda está sendo preparada. Recarregue a página e tente de novo.'
      else msg = `Não foi possível salvar: ${error.message || 'erro desconhecido'}`
      setErrors({ name: msg })
      return
    }
    await load()
    setShowModal(false)
  }

  async function toggleActive(s: Source) {
    const supabase = createClient()
    await supabase.from('lead_sources').update({ active: !s.active }).eq('id', s.id)
    setSources((prev) => prev.map((x) => x.id === s.id ? { ...x, active: !x.active } : x))
  }

  const trackUrl = (code: string) =>
    typeof window !== 'undefined' ? `${window.location.origin}/r/${code}` : `/r/${code}`

  async function copyCardLink(code: string) {
    try { await navigator.clipboard.writeText(trackUrl(code)) } catch {}
    setCopiedCard(code)
    setTimeout(() => setCopiedCard((c) => (c === code ? null : c)), 1800)
  }

  async function openQr(s: Source) {
    setQrSource(s)
    setCopied(false)
    const url = trackUrl(s.code)
    const dataUrl = await QRCode.toDataURL(url, { width: 512, margin: 2, color: { dark: '#0f172a', light: '#ffffff' } })
    setQrDataUrl(dataUrl)
  }

  function downloadQr() {
    if (!qrDataUrl || !qrSource) return
    const a = document.createElement('a')
    a.href = qrDataUrl
    a.download = `qr-${qrSource.code}.png`
    a.click()
  }

  async function copyLink() {
    if (!qrSource) return
    await navigator.clipboard.writeText(trackUrl(qrSource.code))
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header
        title="Captação por QR Code"
        subtitle="Crie um QR para cada indicador e acompanhe quem vendeu por indicação"
        actions={<Button size="sm" onClick={openAdd}><Plus className="h-4 w-4" />Nova origem</Button>}
      />
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <p className="text-slate-400 text-sm">Carregando...</p>
        ) : sources.length === 0 ? (
          <div className="text-center py-16">
            <QrCode className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-600">Nenhuma origem ainda</p>
            <p className="text-xs text-slate-400 mt-1">Crie uma origem para cada parceiro (ex: Restaurante do Zé) e cole o QR no local.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sources.map((s) => (
              <Card key={s.id} className={!s.active ? 'opacity-60' : ''}>
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="h-10 w-10 rounded-xl bg-orange-100 flex items-center justify-center">
                      <QrCode className="h-5 w-5 text-orange-600" />
                    </div>
                    <div className="flex items-center gap-2">
                      {s.kind === 'site' && <Badge variant="secondary">Site</Badge>}
                      <Badge variant={s.active ? 'success' : 'secondary'}>{s.active ? 'Ativa' : 'Inativa'}</Badge>
                    </div>
                  </div>
                  <h3 className="font-semibold text-slate-900">{s.name}</h3>
                  <p className="text-xs text-slate-400 mt-0.5 font-mono">{s.code}</p>
                  {s.description && <p className="text-sm text-slate-500 mt-1.5">{s.description}</p>}

                  <div className="grid grid-cols-3 gap-2 mt-4">
                    <div className="rounded-lg bg-slate-50 p-2.5 text-center">
                      <div className="flex items-center justify-center gap-1 text-slate-400"><ScanLine className="h-3.5 w-3.5" /></div>
                      <p className="text-lg font-black text-slate-900 tabular-nums">{scanCount[s.id] ?? 0}</p>
                      <p className="text-[10px] text-slate-400">scans</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-2.5 text-center">
                      <div className="flex items-center justify-center gap-1 text-slate-400"><Users className="h-3.5 w-3.5" /></div>
                      <p className="text-lg font-black text-slate-900 tabular-nums">{leadCount[s.id] ?? 0}</p>
                      <p className="text-[10px] text-slate-400">leads</p>
                    </div>
                    <div className="rounded-lg bg-orange-50 p-2.5 text-center">
                      <div className="flex items-center justify-center gap-1 text-orange-400"><Bike className="h-3.5 w-3.5" /></div>
                      <p className="text-lg font-black text-orange-600 tabular-nums">{salesCount[s.id] ?? 0}</p>
                      <p className="text-[10px] text-orange-400">vendas</p>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => openQr(s)}>
                      <QrCode className="h-3.5 w-3.5" />Ver QR
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => copyCardLink(s.code)}>
                      {copiedCard === s.code ? <><Check className="h-3.5 w-3.5" />Copiado</> : <><Copy className="h-3.5 w-3.5" />Copiar link</>}
                    </Button>
                    {s.kind !== 'site' && (
                      <Button variant="ghost" size="sm" onClick={() => toggleActive(s)}>
                        <Power className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>

                  {(leadCount[s.id] ?? 0) > 0 && (
                    <button
                      onClick={() => setExpanded((cur) => (cur === s.id ? null : s.id))}
                      className="flex items-center justify-center gap-1.5 w-full mt-3 text-xs font-medium text-slate-500 hover:text-slate-700"
                    >
                      {expanded === s.id ? <><ChevronUp className="h-3.5 w-3.5" />Ocultar leads</> : <><ChevronDown className="h-3.5 w-3.5" />Ver leads ({leadCount[s.id] ?? 0})</>}
                    </button>
                  )}

                  {expanded === s.id && (
                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                      {(leadsBySource[s.id] ?? []).map((lead) => {
                        const meta = LEAD_STATUS_META[lead.status]
                        const soldStatus = lead.service?.status
                        return (
                          <button
                            key={lead.id}
                            onClick={() => lead.converted_service_id && router.push(`/atendimentos/${lead.converted_service_id}`)}
                            disabled={!lead.converted_service_id}
                            className="w-full flex items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 disabled:hover:bg-slate-50 disabled:cursor-default text-left transition-colors"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-800 truncate">{lead.name}</p>
                              <p className="text-xs text-slate-400">{formatWhatsApp(lead.phone)}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {soldStatus ? (
                                <Badge variant={soldStatus.is_closed ? 'success' : 'default'}>{soldStatus.description}</Badge>
                              ) : (
                                <Badge variant={meta.variant}>{meta.label}</Badge>
                              )}
                              {lead.converted_service_id && <ArrowRight className="h-3.5 w-3.5 text-slate-400" />}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Modal criar origem */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nova origem" description="Um ponto de divulgação (parceiro, evento, anúncio...)" size="sm">
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <Input label="Nome da origem" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} error={errors.name} placeholder="Ex: Restaurante do Zé" />
          <Textarea label="Descrição (opcional)" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Onde o QR vai ficar, observações..." />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button type="submit" loading={saving}>Criar origem</Button>
          </div>
        </form>
      </Modal>

      {/* Modal QR */}
      <Modal open={!!qrSource} onClose={() => setQrSource(null)} title={qrSource?.name} description="Cole este QR no ponto de divulgação" size="sm">
        <div className="p-6 flex flex-col items-center">
          {qrDataUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrDataUrl} alt="QR Code" className="w-56 h-56 rounded-xl border border-slate-200" />
          )}
          <p className="text-xs text-slate-400 mt-3 font-mono break-all text-center">{qrSource && trackUrl(qrSource.code)}</p>
          <div className="flex gap-2 mt-5 w-full">
            <Button variant="outline" className="flex-1" onClick={copyLink}>
              {copied ? <><Check className="h-4 w-4" />Copiado</> : <><Copy className="h-4 w-4" />Copiar link</>}
            </Button>
            <Button className="flex-1" onClick={downloadQr}><Download className="h-4 w-4" />Baixar PNG</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

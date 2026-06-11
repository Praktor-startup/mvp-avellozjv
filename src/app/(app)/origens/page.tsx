'use client'

import { useEffect, useState, useCallback } from 'react'
import QRCode from 'qrcode'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Modal } from '@/components/ui/modal'
import { Badge } from '@/components/ui/badge'
import { Plus, QrCode, ScanLine, Users, Download, Copy, Check, Power } from 'lucide-react'

interface Source {
  id: string
  name: string
  code: string
  kind: string
  description: string | null
  active: boolean
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
  const [sources, setSources] = useState<Source[]>([])
  const [scanCount, setScanCount] = useState<Record<string, number>>({})
  const [leadCount, setLeadCount] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', description: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [qrSource, setQrSource] = useState<Source | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [copied, setCopied] = useState(false)

  const load = useCallback(async () => {
    const supabase = createClient()
    const [srcRes, scansRes, leadsRes] = await Promise.all([
      supabase.from('lead_sources').select('*').order('created_at', { ascending: false }),
      supabase.from('scans').select('source_id'),
      supabase.from('leads').select('source_id'),
    ])
    setSources((srcRes.data ?? []) as Source[])
    const sc: Record<string, number> = {}
    ;(scansRes.data ?? []).forEach((r: { source_id: string }) => { sc[r.source_id] = (sc[r.source_id] ?? 0) + 1 })
    setScanCount(sc)
    const lc: Record<string, number> = {}
    ;(leadsRes.data ?? []).forEach((r: { source_id: string | null }) => { if (r.source_id) lc[r.source_id] = (lc[r.source_id] ?? 0) + 1 })
    setLeadCount(lc)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function openAdd() { setForm({ name: '', description: '' }); setErrors({}); setShowModal(true) }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setErrors({ name: 'Nome obrigatório' }); return }
    setSaving(true)
    const supabase = createClient()
    // Garante que a conta esteja vinculada a uma loja antes de inserir
    // (org_id é preenchido pelo default current_org(); sem org a RLS rejeita).
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
      // nunca expõe a mensagem crua do banco; loga p/ debug e mostra texto claro
      console.error('Erro ao criar origem:', error)
      const msg = /row-level security|org/i.test(error.message || '')
        ? 'Sua conta ainda está sendo preparada. Recarregue a página e tente de novo.'
        : 'Não foi possível salvar. Tente outro nome.'
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
        subtitle="Crie um QR para cada ponto e descubra de onde vêm seus clientes"
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

                  <div className="grid grid-cols-2 gap-2 mt-4">
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
                  </div>

                  <div className="flex gap-2 mt-4">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => openQr(s)}>
                      <QrCode className="h-3.5 w-3.5" />Ver QR
                    </Button>
                    {s.kind !== 'site' && (
                      <Button variant="ghost" size="sm" onClick={() => toggleActive(s)}>
                        <Power className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
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

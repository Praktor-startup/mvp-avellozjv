'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatWhatsApp, formatDate } from '@/lib/utils'
import { Phone, MapPin, ArrowRight, Inbox, MessageSquare, Check } from 'lucide-react'

type LeadStatus = 'novo' | 'contatado' | 'convertido' | 'descartado'

interface Lead {
  id: string
  name: string
  phone: string
  interest: string | null
  message: string | null
  status: LeadStatus
  created_at: string
  converted_service_id: string | null
  source: { name: string } | null
}

const STATUS_META: Record<LeadStatus, { label: string; variant: 'default' | 'success' | 'warning' | 'secondary' | 'danger' }> = {
  novo: { label: 'Novo', variant: 'warning' },
  contatado: { label: 'Contatado', variant: 'default' },
  convertido: { label: 'Convertido', variant: 'success' },
  descartado: { label: 'Descartado', variant: 'secondary' },
}

const FILTERS: { value: LeadStatus | 'todos'; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'novo', label: 'Novos' },
  { value: 'contatado', label: 'Contatados' },
  { value: 'convertido', label: 'Convertidos' },
  { value: 'descartado', label: 'Descartados' },
]

export default function LeadsPage() {
  const router = useRouter()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<LeadStatus | 'todos'>('todos')
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('leads')
      .select('id, name, phone, interest, message, status, created_at, converted_service_id, source:source_id(name)')
      .order('created_at', { ascending: false })
    setLeads((data ?? []) as unknown as Lead[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function setStatus(id: string, status: LeadStatus) {
    const supabase = createClient()
    await supabase.from('leads').update({ status }).eq('id', id)
    setLeads((prev) => prev.map((l) => l.id === id ? { ...l, status } : l))
  }

  async function convert(lead: Lead) {
    if (lead.converted_service_id) { router.push(`/atendimentos/${lead.converted_service_id}`); return }
    setBusy(lead.id)
    const supabase = createClient()
    const { data, error } = await supabase.rpc('convert_lead', { p_lead: lead.id })
    setBusy(null)
    if (!error && data) {
      router.push(`/atendimentos/${data}`)
    }
  }

  const filtered = filter === 'todos' ? leads : leads.filter((l) => l.status === filter)
  const novos = leads.filter((l) => l.status === 'novo').length

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header
        title="Leads"
        subtitle={novos > 0 ? `${novos} novo${novos !== 1 ? 's' : ''} aguardando contato` : 'Contatos captados pela landing e QR codes'}
      />
      <div className="flex-1 overflow-y-auto p-6">
        {/* Filtros */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`shrink-0 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
                filter === f.value ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-slate-400 text-sm">Carregando...</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Inbox className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-600">Nenhum lead {filter !== 'todos' ? 'neste filtro' : 'ainda'}</p>
            <p className="text-xs text-slate-400 mt-1">Os contatos que chegarem pela landing/QR aparecem aqui.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((lead) => {
              const meta = STATUS_META[lead.status]
              return (
                <Card key={lead.id}>
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                          <span className="text-sm font-black text-orange-600">{lead.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-slate-900 truncate">{lead.name}</h3>
                          <p className="text-xs text-slate-400">{formatDate(lead.created_at)}</p>
                        </div>
                      </div>
                      <Badge variant={meta.variant}>{meta.label}</Badge>
                    </div>

                    <div className="space-y-1.5 mt-3 text-sm">
                      <a href={`https://wa.me/55${lead.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-slate-600 hover:text-emerald-600">
                        <Phone className="h-3.5 w-3.5 shrink-0" />{formatWhatsApp(lead.phone)}
                      </a>
                      <p className="flex items-center gap-2 text-slate-500">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />Origem: <span className="font-medium text-slate-700">{lead.source?.name ?? 'Site'}</span>
                      </p>
                      {lead.interest && (
                        <p className="flex items-center gap-2 text-slate-500">
                          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">Interesse: {lead.interest}</span>
                        </p>
                      )}
                      {lead.message && (
                        <p className="flex items-start gap-2 text-slate-500 pt-1">
                          <MessageSquare className="h-3.5 w-3.5 shrink-0 mt-0.5" /><span className="italic">“{lead.message}”</span>
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 mt-4">
                      {lead.status === 'convertido' ? (
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => convert(lead)}>
                          Ver atendimento <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      ) : (
                        <>
                          <Button size="sm" className="flex-1" loading={busy === lead.id} onClick={() => convert(lead)}>
                            <Check className="h-3.5 w-3.5" />Virar atendimento
                          </Button>
                          {lead.status === 'novo' && (
                            <Button variant="outline" size="sm" onClick={() => setStatus(lead.id, 'contatado')}>Marcar contatado</Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => setStatus(lead.id, 'descartado')}>Descartar</Button>
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

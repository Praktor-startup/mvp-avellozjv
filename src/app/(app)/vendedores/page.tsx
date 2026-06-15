'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Modal } from '@/components/ui/modal'
import { Badge } from '@/components/ui/badge'
import { formatWhatsApp } from '@/lib/utils'
import { Plus, Edit, Power, Phone } from 'lucide-react'
import type { Seller } from '@/types'

export default function VendedoresPage() {
  const [sellers, setSellers] = useState<Seller[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<Seller | null>(null)
  const [form, setForm] = useState({ name: '', whatsapp: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})

  async function load() {
    const supabase = createClient()
    const { data } = await supabase.from('sellers').select('*').order('name')
    setSellers((data ?? []) as Seller[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openAdd() { setEditing(null); setForm({ name: '', whatsapp: '' }); setErrors({}); setShowModal(true) }
  function openEdit(s: Seller) { setEditing(s); setForm({ name: s.name, whatsapp: s.whatsapp }); setErrors({}); setShowModal(true) }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!form.name.trim()) errs.name = 'Nome obrigatório'
    if (!form.whatsapp.trim()) errs.whatsapp = 'WhatsApp obrigatório'
    if (Object.keys(errs).length) { setErrors(errs); return }

    setSaving(true)
    const supabase = createClient()
    if (editing) {
      await supabase.from('sellers').update({ name: form.name.trim(), whatsapp: form.whatsapp.trim() }).eq('id', editing.id)
    } else {
      await supabase.from('sellers').insert({ name: form.name.trim(), whatsapp: form.whatsapp.trim() })
    }
    await load()
    setShowModal(false)
    setSaving(false)
  }

  async function toggleActive(s: Seller) {
    const supabase = createClient()
    await supabase.from('sellers').update({ active: !s.active }).eq('id', s.id)
    setSellers((prev) => prev.map((x) => x.id === s.id ? { ...x, active: !x.active } : x))
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header
        title="Vendedores"
        subtitle={`${sellers.filter((s) => s.active).length} ativo${sellers.filter((s) => s.active).length !== 1 ? 's' : ''}`}
        actions={<Button size="sm" onClick={openAdd}><Plus className="h-4 w-4" />Novo vendedor</Button>}
      />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <p className="text-slate-400 text-sm">Carregando...</p>
          ) : sellers.length === 0 ? (
            <p className="text-slate-400 text-sm">Nenhum vendedor cadastrado</p>
          ) : (
            sellers.map((s) => (
              <Card key={s.id} className={!s.active ? 'opacity-60' : ''}>
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="h-10 w-10 rounded-xl bg-brand-100 flex items-center justify-center">
                      <span className="text-sm font-bold text-brand-600">{s.name.charAt(0)}</span>
                    </div>
                    <Badge variant={s.active ? 'success' : 'secondary'}>{s.active ? 'Ativo' : 'Inativo'}</Badge>
                  </div>
                  <h3 className="font-semibold text-slate-900">{s.name}</h3>
                  <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-1">
                    <Phone className="h-3.5 w-3.5" />{formatWhatsApp(s.whatsapp)}
                  </p>
                  <div className="flex gap-2 mt-4">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(s)}>
                      <Edit className="h-3.5 w-3.5" />Editar
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => toggleActive(s)}>
                      <Power className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Editar vendedor' : 'Novo vendedor'} size="sm">
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <Input label="Nome" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} error={errors.name} placeholder="Nome completo" />
          <Input label="WhatsApp" required value={form.whatsapp} onChange={(e) => setForm((f) => ({ ...f, whatsapp: e.target.value }))} error={errors.whatsapp} placeholder="(11) 99999-9999" />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button type="submit" loading={saving}>Salvar</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

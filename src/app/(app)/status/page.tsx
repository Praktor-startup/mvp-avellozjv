'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Plus, Edit, Power, GripVertical } from 'lucide-react'
import type { Status } from '@/types'

export default function StatusPage() {
  const [statuses, setStatuses] = useState<Status[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<Status | null>(null)
  const [form, setForm] = useState({ description: '', generates_reminder: false, is_closed: false, is_lost: false })
  const [errors, setErrors] = useState<Record<string, string>>({})

  async function load() {
    const supabase = createClient()
    const { data } = await supabase.from('statuses').select('*').order('sort_order')
    setStatuses((data ?? []) as Status[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openAdd() {
    setEditing(null)
    setForm({ description: '', generates_reminder: false, is_closed: false, is_lost: false })
    setErrors({})
    setShowModal(true)
  }

  function openEdit(s: Status) {
    setEditing(s)
    setForm({ description: s.description, generates_reminder: s.generates_reminder, is_closed: s.is_closed, is_lost: s.is_lost })
    setErrors({})
    setShowModal(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.description.trim()) { setErrors({ description: 'Descrição obrigatória' }); return }
    setSaving(true)
    const supabase = createClient()
    if (editing) {
      await supabase.from('statuses').update(form).eq('id', editing.id)
    } else {
      const maxOrder = Math.max(0, ...statuses.map((s) => s.sort_order))
      await supabase.from('statuses').insert({ ...form, sort_order: maxOrder + 1 })
    }
    await load()
    setShowModal(false)
    setSaving(false)
  }

  async function toggleActive(s: Status) {
    const supabase = createClient()
    await supabase.from('statuses').update({ active: !s.active }).eq('id', s.id)
    setStatuses((prev) => prev.map((x) => x.id === s.id ? { ...x, active: !x.active } : x))
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header
        title="Status"
        subtitle="Situações possíveis do atendimento"
        actions={<Button size="sm" onClick={openAdd}><Plus className="h-4 w-4" />Novo status</Button>}
      />
      <div className="flex-1 overflow-y-auto p-6">
        <Card>
          <div className="divide-y divide-slate-100">
            {loading ? (
              <div className="px-6 py-8 text-center text-slate-400 text-sm">Carregando...</div>
            ) : statuses.map((s) => (
              <div key={s.id} className={`flex items-center gap-4 px-6 py-4 ${!s.active ? 'opacity-60' : ''}`}>
                <GripVertical className="h-4 w-4 text-slate-300 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900">{s.description}</p>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {s.generates_reminder && <Badge variant="warning">Gera lembrete 21 dias</Badge>}
                    {s.is_closed && <Badge variant="success">Venda fechada</Badge>}
                    {s.is_lost && <Badge variant="danger">Venda perdida</Badge>}
                    {!s.active && <Badge variant="secondary">Inativo</Badge>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Edit className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => toggleActive(s)}><Power className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Editar status' : 'Novo status'} size="sm">
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <Input label="Descrição" required value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} error={errors.description} placeholder="Ex: Consulta aprovada" />
          <div className="space-y-2">
            {[
              { key: 'generates_reminder', label: 'Gera lembrete de reconsulta em 21 dias' },
              { key: 'is_closed', label: 'Considera como venda fechada' },
              { key: 'is_lost', label: 'Considera como venda perdida' },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={form[key as keyof typeof form] as boolean}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-sm text-slate-700">{label}</span>
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button type="submit" loading={saving}>Salvar</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

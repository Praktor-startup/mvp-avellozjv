'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Plus, Edit, Power, Megaphone } from 'lucide-react'
import type { CustomerChannel } from '@/types'

export default function CanaisPage() {
  const [channels, setChannels] = useState<CustomerChannel[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<CustomerChannel | null>(null)
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  async function load() {
    const supabase = createClient()
    const { data } = await supabase.from('customer_channels').select('*').order('description')
    setChannels((data ?? []) as CustomerChannel[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openAdd() { setEditing(null); setName(''); setError(''); setShowModal(true) }
  function openEdit(c: CustomerChannel) { setEditing(c); setName(c.description); setError(''); setShowModal(true) }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Descrição obrigatória'); return }
    setSaving(true)
    const supabase = createClient()
    if (editing) {
      await supabase.from('customer_channels').update({ description: name.trim() }).eq('id', editing.id)
    } else {
      await supabase.from('customer_channels').insert({ description: name.trim() })
    }
    await load()
    setShowModal(false)
    setSaving(false)
  }

  async function toggleActive(c: CustomerChannel) {
    const supabase = createClient()
    await supabase.from('customer_channels').update({ active: !c.active }).eq('id', c.id)
    setChannels((prev) => prev.map((x) => x.id === c.id ? { ...x, active: !x.active } : x))
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header
        title="Canal de Origem"
        subtitle="Como o cliente chegou até você (Instagram, indicação, Google...)"
        actions={<Button size="sm" onClick={openAdd}><Plus className="h-4 w-4" />Novo canal</Button>}
      />
      <div className="flex-1 overflow-y-auto p-6">
        <Card>
          <div className="divide-y divide-slate-100">
            {loading ? (
              <div className="px-6 py-8 text-center text-slate-400 text-sm">Carregando...</div>
            ) : channels.map((c) => (
              <div key={c.id} className={`flex items-center gap-4 px-6 py-4 ${!c.active ? 'opacity-60' : ''}`}>
                <Megaphone className={`h-4 w-4 shrink-0 ${c.active ? 'text-slate-400' : 'text-slate-300'}`} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">{c.description}</p>
                  {!c.active && <Badge variant="secondary" className="mt-1">Inativo</Badge>}
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Edit className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => toggleActive(c)}><Power className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Editar canal' : 'Novo canal de origem'} size="sm">
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <Input label="Descrição" required value={name} onChange={(e) => { setName(e.target.value); setError('') }} error={error} placeholder="Ex: Instagram" />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button type="submit" loading={saving}>Salvar</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

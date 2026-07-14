'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Plus, Edit, Power, Bike } from 'lucide-react'
import type { MotorcycleType } from '@/types'

export default function MotosPage() {
  const [motos, setMotos] = useState<MotorcycleType[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<MotorcycleType | null>(null)
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [error, setError] = useState('')

  function formatPrice(v: number | null) {
    if (v == null) return null
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  async function load() {
    const supabase = createClient()
    const { data } = await supabase.from('motorcycle_types').select('*').order('model')
    setMotos((data ?? []) as MotorcycleType[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openAdd() { setEditing(null); setName(''); setPrice(''); setError(''); setShowModal(true) }
  function openEdit(m: MotorcycleType) { setEditing(m); setName(m.model); setPrice(m.price != null ? String(m.price).replace('.', ',') : ''); setError(''); setShowModal(true) }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Modelo obrigatório'); return }
    const cleanPrice = price.trim().replace(/\./g, '').replace(',', '.')
    const parsedPrice = cleanPrice ? Number(cleanPrice) : null
    if (cleanPrice && Number.isNaN(parsedPrice)) { setError('Valor inválido'); return }
    setSaving(true)
    const supabase = createClient()
    if (editing) {
      await supabase.from('motorcycle_types').update({ model: name.trim(), price: parsedPrice }).eq('id', editing.id)
    } else {
      await supabase.from('motorcycle_types').insert({ model: name.trim(), price: parsedPrice })
    }
    await load()
    setShowModal(false)
    setSaving(false)
  }

  async function toggleActive(m: MotorcycleType) {
    const supabase = createClient()
    await supabase.from('motorcycle_types').update({ active: !m.active }).eq('id', m.id)
    setMotos((prev) => prev.map((x) => x.id === m.id ? { ...x, active: !x.active } : x))
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header
        title="Tipos de Moto"
        subtitle={`${motos.filter((m) => m.active).length} ativo${motos.filter((m) => m.active).length !== 1 ? 's' : ''}`}
        actions={<Button size="sm" onClick={openAdd}><Plus className="h-4 w-4" />Novo modelo</Button>}
      />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <p className="text-slate-400 text-sm">Carregando...</p>
          ) : motos.map((m) => (
            <Card key={m.id} className={!m.active ? 'opacity-60' : ''}>
              <div className="p-4 flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                  <Bike className="h-4 w-4 text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 truncate">{m.model}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={m.active ? 'success' : 'secondary'}>{m.active ? 'Ativo' : 'Inativo'}</Badge>
                    {formatPrice(m.price) && <span className="text-xs text-slate-500">{formatPrice(m.price)}</span>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(m)}><Edit className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => toggleActive(m)}><Power className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Editar modelo' : 'Novo modelo'} size="sm">
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <Input label="Modelo" required value={name} onChange={(e) => { setName(e.target.value); setError('') }} error={error} placeholder="Ex: Honda CG 160" />
          <Input label="Valor de consulta (R$)" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Ex: 12.500,00" inputMode="decimal" />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button type="submit" loading={saving}>Salvar</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

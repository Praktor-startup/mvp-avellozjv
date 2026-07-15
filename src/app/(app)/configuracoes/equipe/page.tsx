'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card } from '@/components/ui/card'
import { Modal } from '@/components/ui/modal'
import { Badge } from '@/components/ui/badge'
import { formatCPF, formatWhatsApp, validateCPF } from '@/lib/utils'
import { Plus, Trash2, ShieldCheck, User, AlertTriangle, CheckCircle, Lock, Phone, IdCard, Mail, Wrench } from 'lucide-react'

type Role = 'gestor' | 'vendedor' | 'tecnico'

const ROLE_META: Record<Role, {
  label: string
  badge: 'info' | 'secondary' | 'warning'
  icon: typeof ShieldCheck
  iconBg: string
  iconColor: string
}> = {
  tecnico:  { label: 'Técnico',  badge: 'warning',   icon: Wrench,      iconBg: 'bg-amber-100',  iconColor: 'text-amber-600' },
  gestor:   { label: 'Gestor',   badge: 'info',      icon: ShieldCheck, iconBg: 'bg-blue-50',    iconColor: 'text-blue-700' },
  vendedor: { label: 'Vendedor', badge: 'secondary', icon: User,        iconBg: 'bg-slate-100',  iconColor: 'text-slate-500' },
}

interface Member {
  user_id: string
  email: string
  nome: string
  phone: string | null
  cpf: string | null
  role: Role
  is_me: boolean
  created_at: string
}

export default function EquipePage() {
  const [myRole, setMyRole] = useState<Role | null | 'loading'>('loading')
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ nome: '', email: '', phone: '', cpf: '', password: '', role: 'vendedor' as Role })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')
  const [success, setSuccess] = useState('')
  const [removingId, setRemovingId] = useState<string | null>(null)

  async function load() {
    const supabase = createClient()
    const [{ data: role }, { data: team }] = await Promise.all([
      supabase.rpc('my_role'),
      supabase.rpc('list_team'),
    ])
    setMyRole((role as Role) ?? null)
    setMembers((team ?? []) as Member[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openAdd() {
    setForm({ nome: '', email: '', phone: '', cpf: '', password: '', role: 'vendedor' })
    setErrors({})
    setFormError('')
    setShowModal(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!form.nome.trim()) errs.nome = 'Nome completo obrigatório'
    if (!form.email.trim()) errs.email = 'E-mail obrigatório'
    if (form.phone.replace(/\D/g, '').length < 10) errs.phone = 'Telefone com DDD obrigatório'
    if (!validateCPF(form.cpf)) errs.cpf = 'CPF inválido'
    if (form.password.length < 6) errs.password = 'Mínimo 6 caracteres'
    if (Object.keys(errs).length) { setErrors(errs); return }

    setSaving(true)
    setFormError('')
    const supabase = createClient()
    const { error } = await supabase.rpc('create_team_member', {
      p_email: form.email.trim(),
      p_password: form.password,
      p_nome: form.nome.trim(),
      p_role: form.role,
      p_phone: form.phone.trim(),
      p_cpf: form.cpf.trim(),
    })
    if (error) {
      setFormError(error.message || 'Erro ao cadastrar conta')
      setSaving(false)
      return
    }
    setShowModal(false)
    setSaving(false)
    setSuccess(`Conta de ${ROLE_META[form.role].label} criada para ${form.email.trim()}`)
    setTimeout(() => setSuccess(''), 5000)
    await load()
  }

  async function handleRemove(m: Member) {
    if (!confirm(`Remover ${m.nome} (${m.email}) da loja? O acesso será revogado.`)) return
    setRemovingId(m.user_id)
    const supabase = createClient()
    const { error } = await supabase.rpc('remove_team_member', { p_user_id: m.user_id })
    if (error) { setFormError(error.message); setRemovingId(null); return }
    setRemovingId(null)
    await load()
  }

  // Acesso restrito: vendedor não vê esta tela (só técnico/gestor)
  if (myRole !== 'loading' && myRole !== 'gestor' && myRole !== 'tecnico') {
    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header title="Equipe" subtitle="Gestão de contas" />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-sm">
            <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Lock className="h-6 w-6 text-slate-400" />
            </div>
            <h2 className="text-base font-semibold text-slate-900">Acesso restrito</h2>
            <p className="text-sm text-slate-500 mt-1">
              Apenas gestores podem cadastrar e gerenciar contas da loja. Fale com o gestor responsável.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const admins = members.filter((m) => m.role === 'gestor' || m.role === 'tecnico').length
  const vendedores = members.filter((m) => m.role === 'vendedor').length

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header
        title="Equipe"
        subtitle={`${admins} gestor${admins !== 1 ? 'es' : ''}/técnico · ${vendedores} vendedor${vendedores !== 1 ? 'es' : ''}`}
        actions={<Button size="sm" onClick={openAdd}><Plus className="h-4 w-4" />Nova conta</Button>}
      />
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {success && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
            <p className="text-sm text-green-700">{success}</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <p className="text-slate-400 text-sm">Carregando...</p>
          ) : members.length === 0 ? (
            <p className="text-slate-400 text-sm">Nenhuma conta na loja</p>
          ) : (
            members.map((m) => {
              const meta = ROLE_META[m.role] ?? ROLE_META.vendedor
              const RoleIcon = meta.icon
              return (
                <Card key={m.user_id}>
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${meta.iconBg}`}>
                        <RoleIcon className={`h-5 w-5 ${meta.iconColor}`} />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Badge variant={meta.badge}>{meta.label}</Badge>
                        {m.is_me && <Badge variant="outline">você</Badge>}
                      </div>
                    </div>
                    <h3 className="font-semibold text-slate-900 truncate" title={m.nome}>{m.nome}</h3>
                    <div className="mt-2 space-y-1">
                      <p className="text-sm text-slate-500 flex items-center gap-1.5 truncate" title={m.email}>
                        <Mail className="h-3.5 w-3.5 shrink-0" />{m.email}
                      </p>
                      {m.phone && (
                        <p className="text-sm text-slate-500 flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 shrink-0" />{formatWhatsApp(m.phone)}
                        </p>
                      )}
                      {m.cpf && (
                        <p className="text-sm text-slate-500 flex items-center gap-1.5">
                          <IdCard className="h-3.5 w-3.5 shrink-0" />{formatCPF(m.cpf)}
                        </p>
                      )}
                    </div>
                    {!m.is_me && (
                      <div className="mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-red-600 hover:bg-red-50 border-red-200"
                          onClick={() => handleRemove(m)}
                          loading={removingId === m.user_id}
                        >
                          <Trash2 className="h-3.5 w-3.5" />Remover acesso
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              )
            })
          )}
        </div>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nova conta" size="sm">
        <form onSubmit={handleSave} className="p-6 space-y-4">
          {formError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
              <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
              <p className="text-sm text-red-700">{formError}</p>
            </div>
          )}
          <Input
            label="Nome" required value={form.nome}
            onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
            error={errors.nome} placeholder="Nome completo"
          />
          <Input
            label="Telefone" required value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            error={errors.phone} placeholder="(83) 99999-9999" inputMode="tel"
          />
          <Input
            label="E-mail" type="email" required value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            error={errors.email} placeholder="email@avelloz.com.br" autoComplete="off"
          />
          <Input
            label="CPF" required value={form.cpf}
            onChange={(e) => setForm((f) => ({ ...f, cpf: e.target.value }))}
            error={errors.cpf} placeholder="000.000.000-00" inputMode="numeric"
          />
          <Input
            label="Senha" type="password" required value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            error={errors.password} placeholder="Mínimo 6 caracteres" autoComplete="new-password"
          />
          <Select
            label="Papel" required value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Role }))}
            options={[
              { value: 'vendedor', label: 'Vendedor — opera só os próprios atendimentos' },
              { value: 'gestor', label: 'Gestor — acesso total + cadastra contas' },
              { value: 'tecnico', label: 'Técnico — acesso técnico/administrativo' },
            ]}
          />
          <p className="text-xs text-slate-500">
            A conta entra nesta loja e já pode acessar com o e-mail e senha definidos.
            Vendedor recebe automaticamente um cadastro na lista de vendedores.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button type="submit" loading={saving}>Criar conta</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

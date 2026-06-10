'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Bike, AlertTriangle, CheckCircle } from 'lucide-react'

type Mode = 'login' | 'cadastro'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [nome, setNome] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  function resetForm() {
    setEmail('')
    setPassword('')
    setConfirmPassword('')
    setNome('')
    setError('')
    setSuccess('')
  }

  function switchMode(m: Mode) {
    setMode(m)
    resetForm()
  }

  function authClient() {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password.trim()) {
      setError('Preencha e-mail e senha')
      return
    }
    setLoading(true)
    setError('')
    const supabase = authClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) {
      setError('E-mail ou senha incorretos')
      setLoading(false)
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  async function handleCadastro(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      setError('Preencha todos os campos')
      return
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem')
      return
    }
    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres')
      return
    }
    setLoading(true)
    setError('')
    const supabase = authClient()
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nome } },
    })
    if (authError) {
      setError(authError.message === 'User already registered'
        ? 'Este e-mail já está cadastrado'
        : 'Erro ao criar conta. Tente novamente.')
      setLoading(false)
      return
    }
    // Se sessão foi criada imediatamente (confirmação desativada no Supabase)
    if (data.session) {
      router.push('/dashboard')
      router.refresh()
      return
    }
    // Caso contrário, pede para confirmar e-mail
    setSuccess('Conta criada! Verifique seu e-mail para confirmar o cadastro.')
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center">
              <Bike className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-base font-bold text-slate-900 leading-none">Avelloz</p>
              <p className="text-xs text-slate-500 mt-0.5">Gestão comercial</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex rounded-lg bg-slate-100 p-1 mb-6">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`flex-1 text-sm font-medium py-1.5 rounded-md transition-colors ${
                mode === 'login'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => switchMode('cadastro')}
              className={`flex-1 text-sm font-medium py-1.5 rounded-md transition-colors ${
                mode === 'cadastro'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Criar conta
            </button>
          </div>

          {/* Erro */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 mb-4">
              <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Sucesso */}
          {success && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200 mb-4">
              <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
              <p className="text-sm text-green-700">{success}</p>
            </div>
          )}

          {/* Formulário Login */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <Input
                label="E-mail"
                type="email"
                required
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError('') }}
                placeholder="seu@email.com"
                autoComplete="email"
              />
              <Input
                label="Senha"
                type="password"
                required
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError('') }}
                placeholder="Sua senha"
                autoComplete="current-password"
              />
              <Button type="submit" className="w-full" loading={loading}>
                Entrar
              </Button>
            </form>
          )}

          {/* Formulário Cadastro */}
          {mode === 'cadastro' && !success && (
            <form onSubmit={handleCadastro} className="space-y-4">
              <Input
                label="Nome completo"
                type="text"
                required
                value={nome}
                onChange={(e) => { setNome(e.target.value); setError('') }}
                placeholder="Seu nome"
                autoComplete="name"
              />
              <Input
                label="E-mail"
                type="email"
                required
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError('') }}
                placeholder="seu@email.com"
                autoComplete="email"
              />
              <Input
                label="Senha"
                type="password"
                required
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError('') }}
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
              />
              <Input
                label="Confirmar senha"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setError('') }}
                placeholder="Repita a senha"
                autoComplete="new-password"
              />
              <Button type="submit" className="w-full" loading={loading}>
                Criar conta
              </Button>
            </form>
          )}

          {/* Após sucesso no cadastro */}
          {mode === 'cadastro' && success && (
            <button
              type="button"
              onClick={() => switchMode('login')}
              className="w-full text-sm text-indigo-600 hover:underline text-center mt-2"
            >
              Ir para o login
            </button>
          )}

          {/* Acesso rápido demo */}
          {mode === 'login' && !loading && (
            <div className="mt-6 pt-5 border-t border-slate-100">
              <p className="text-xs text-slate-400 text-center mb-3">Acesso rápido para demonstração</p>
              <button
                type="button"
                onClick={() => {
                  setEmail('demo@avelloz.com.br')
                  setPassword('demo1234')
                  setError('')
                }}
                className="w-full text-sm text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg py-2 px-3 transition-colors"
              >
                Entrar como Demo
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

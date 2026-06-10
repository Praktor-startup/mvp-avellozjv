'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import {
  BarChart3,
  CreditCard,
  Bell,
  Users,
  FileText,
  TrendingUp,
  ClipboardList,
  ChevronDown,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react'

export default function LandingPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'cadastro'>('login')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  function switchMode(m: 'login' | 'cadastro') {
    setMode(m)
    setError('')
    setSuccess('')
    setNome('')
    setPassword('')
    setConfirmPassword('')
  }

  function supabase() {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password.trim()) { setError('Preencha e-mail e senha'); return }
    setLoading(true)
    setError('')
    const { error: authError } = await supabase().auth.signInWithPassword({ email, password })
    if (authError) { setError('E-mail ou senha incorretos'); setLoading(false); return }
    router.push('/dashboard')
    router.refresh()
  }

  async function handleCadastro(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim() || !email.trim() || !password.trim()) { setError('Preencha todos os campos'); return }
    if (password !== confirmPassword) { setError('As senhas não coincidem'); return }
    if (password.length < 6) { setError('Senha deve ter mínimo 6 caracteres'); return }
    setLoading(true)
    setError('')
    const { data, error: authError } = await supabase().auth.signUp({
      email,
      password,
      options: { data: { nome } },
    })
    if (authError) {
      setError(authError.message === 'User already registered' ? 'E-mail já cadastrado' : 'Erro ao criar conta. Tente novamente.')
      setLoading(false)
      return
    }
    if (data.session) {
      router.push('/dashboard')
      router.refresh()
      return
    }
    setSuccess('Conta criada! Verifique seu e-mail para confirmar.')
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#0f0f13] text-white font-sans">

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0f0f13]/90 backdrop-blur-md border-b border-white/5">
        <div className="max-w-6xl mx-auto px-5 flex items-center justify-between h-14">
          <div className="flex items-center gap-2.5">
            <span className="text-xl font-black tracking-tight text-white">AVELLOZ</span>
            <span className="hidden sm:block text-[10px] font-medium text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full uppercase tracking-widest">
              Gestão
            </span>
          </div>
          <a
            href="#acesso"
            className="text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-lg transition-colors"
          >
            Acessar
          </a>
        </div>
      </nav>

      {/* HERO */}
      <section className="pt-24 sm:pt-28 pb-0 px-5">
        <div className="max-w-6xl mx-auto">

          {/* Tagline */}
          <div className="text-center mb-10 sm:mb-14">
            <p className="text-indigo-400 text-xs font-bold uppercase tracking-[0.2em] mb-4">
              Controle de atendimento · Financiamento · Retorno de clientes
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.05] tracking-tight mb-5">
              Sua concessionária<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">
                no controle total
              </span>
            </h1>
            <p className="text-slate-400 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
              Do cliente que entrou na loja até a moto saindo pela porta — funil de vendas, crédito e lembretes em um só lugar.
            </p>
          </div>

          {/* Card de login/cadastro centralizado */}
          <div id="acesso" className="max-w-md mx-auto">
            <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-7 backdrop-blur-sm">

              {/* Abas */}
              <div className="flex bg-white/5 rounded-lg p-1 mb-5">
                {(['login', 'cadastro'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => switchMode(m)}
                    className={`flex-1 text-sm font-semibold py-1.5 rounded-md transition-all ${
                      mode === m ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {m === 'login' ? 'Entrar' : 'Criar conta'}
                  </button>
                ))}
              </div>

              {/* Erro / Sucesso */}
              {error && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5 mb-4">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <p className="text-sm text-red-300">{error}</p>
                </div>
              )}
              {success && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2.5 mb-4">
                  <p className="text-sm text-emerald-300">{success}</p>
                </div>
              )}

              {/* Login */}
              {mode === 'login' && (
                <form onSubmit={handleLogin} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">E-mail</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError('') }}
                      placeholder="seu@email.com"
                      autoComplete="email"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Senha</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setError('') }}
                        placeholder="••••••••"
                        autoComplete="current-password"
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all pr-10"
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-2.5 rounded-lg transition-colors text-sm mt-1">
                    {loading ? 'Entrando...' : 'Entrar'}
                  </button>
                </form>
              )}

              {/* Cadastro */}
              {mode === 'cadastro' && !success && (
                <form onSubmit={handleCadastro} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Nome completo</label>
                    <input type="text" required value={nome} onChange={(e) => { setNome(e.target.value); setError('') }} placeholder="Seu nome" autoComplete="name"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">E-mail</label>
                    <input type="email" required value={email} onChange={(e) => { setEmail(e.target.value); setError('') }} placeholder="seu@email.com" autoComplete="email"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Senha</label>
                    <div className="relative">
                      <input type={showPassword ? 'text' : 'password'} required value={password} onChange={(e) => { setPassword(e.target.value); setError('') }} placeholder="Mínimo 6 caracteres" autoComplete="new-password"
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all pr-10" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Confirmar senha</label>
                    <input type="password" required value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); setError('') }} placeholder="Repita a senha" autoComplete="new-password"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all" />
                  </div>
                  <button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-2.5 rounded-lg transition-colors text-sm mt-1">
                    {loading ? 'Criando conta...' : 'Criar conta'}
                  </button>
                </form>
              )}

              {/* Pós-cadastro */}
              {mode === 'cadastro' && success && (
                <button type="button" onClick={() => switchMode('login')} className="w-full text-sm text-indigo-400 hover:text-indigo-300 text-center mt-2 transition-colors">
                  Ir para o login →
                </button>
              )}
            </div>
          </div>

          {/* Métricas decorativas */}
          <div className="grid grid-cols-3 gap-3 sm:gap-6 max-w-md mx-auto mt-8 pb-16">
            {[
              { value: '21 dias', label: 'alerta de reconsulta' },
              { value: '100%', label: 'histórico centralizado' },
              { value: 'Real-time', label: 'dashboard ao vivo' },
            ].map((m) => (
              <div key={m.label} className="text-center">
                <p className="text-lg sm:text-xl font-black text-white">{m.value}</p>
                <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5">{m.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DIVISOR */}
      <div className="border-t border-white/5" />

      {/* FUNCIONALIDADES */}
      <section className="py-16 sm:py-20 px-5 bg-[#0f0f13]">
        <div className="max-w-6xl mx-auto">
          <div className="mb-10 sm:mb-12">
            <p className="text-indigo-400 text-xs font-bold uppercase tracking-[0.2em] mb-3">Funcionalidades</p>
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              Tudo que sua loja precisa
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {[
              { icon: BarChart3, title: 'Dashboard ao vivo', desc: 'Taxa de conversão, aprovações e vendas. Funil completo sem planilha.' },
              { icon: CreditCard, title: 'Consultas de crédito', desc: 'Aprovado, com restrição ou negado — histórico completo por cliente.' },
              { icon: Bell, title: 'Lembretes de reconsulta', desc: 'Alerta automático em 21 dias quando o crédito vence.' },
              { icon: Users, title: 'Gestão de vendedores', desc: 'Performance individual: atendimentos, consultas e conversões.' },
              { icon: FileText, title: 'Relatórios', desc: 'Exporte dados de atendimentos e resultados para análise.' },
              { icon: ClipboardList, title: 'Funil com status', desc: 'Em análise, aprovado, fechado ou perdido — com motivo registrado.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="group bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-indigo-500/30 rounded-xl p-5 transition-all cursor-default">
                <div className="w-9 h-9 rounded-lg bg-indigo-500/10 flex items-center justify-center mb-4">
                  <Icon className="w-4 h-4 text-indigo-400" />
                </div>
                <h3 className="font-bold text-white text-sm mb-1.5">{title}</h3>
                <p className="text-slate-500 text-xs leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section className="py-16 sm:py-20 px-5 bg-[#0c0c10]">
        <div className="max-w-6xl mx-auto">
          <div className="mb-10 sm:mb-12">
            <p className="text-indigo-400 text-xs font-bold uppercase tracking-[0.2em] mb-3">Fluxo</p>
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              Como funciona na prática
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[
              { step: '01', icon: Users, title: 'Cliente entra', desc: 'Vendedor cadastra nome, telefone e interesse em segundos.' },
              { step: '02', icon: CreditCard, title: 'Consulta de crédito', desc: 'Resultado registrado: aprovado, restrição ou negado.' },
              { step: '03', icon: TrendingUp, title: 'Avança no funil', desc: 'Status atualizado em cada etapa da negociação.' },
              { step: '04', icon: BarChart3, title: 'Dashboard atualizado', desc: 'Gerente vê conversão e performance em tempo real.' },
            ].map(({ step, icon: Icon, title, desc }) => (
              <div key={step} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5 relative overflow-hidden">
                <p className="absolute top-4 right-5 text-4xl font-black text-white/[0.04] select-none">{step}</p>
                <div className="w-9 h-9 rounded-lg bg-indigo-500/10 flex items-center justify-center mb-4">
                  <Icon className="w-4 h-4 text-indigo-400" />
                </div>
                <h3 className="font-bold text-white text-sm mb-1.5">{title}</h3>
                <p className="text-slate-500 text-xs leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 sm:py-20 px-5 bg-[#0f0f13]">
        <div className="max-w-2xl mx-auto">
          <div className="mb-10">
            <p className="text-indigo-400 text-xs font-bold uppercase tracking-[0.2em] mb-3">Dúvidas</p>
            <h2 className="text-2xl sm:text-3xl font-black text-white">Perguntas frequentes</h2>
          </div>

          <div className="space-y-2">
            {[
              { q: 'Precisa instalar algum programa?', a: 'Não. O Avelloz é 100% web — funciona no navegador do computador, tablet ou celular.' },
              { q: 'Funciona no celular?', a: 'Sim. Layout responsivo para vendedor cadastrar atendimento pelo celular enquanto atende o cliente.' },
              { q: 'Meus dados ficam seguros?', a: 'Sim. Infraestrutura com criptografia e backups automáticos. Nenhum dado é compartilhado com terceiros.' },
              { q: 'Posso exportar meus dados?', a: 'Sim. Relatórios de atendimentos, consultas de crédito e performance de vendedores são exportáveis.' },
              { q: 'Quanto tempo leva para começar?', a: 'Um dia no máximo. Cadastra a loja, adiciona vendedores e começa a registrar. Sem treinamento longo.' },
            ].map((item, i) => (
              <details key={i} className="group bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
                <summary className="flex items-center justify-between cursor-pointer px-5 py-4 text-sm font-semibold text-white hover:text-indigo-300 transition-colors list-none">
                  {item.q}
                  <ChevronDown className="w-4 h-4 text-slate-500 group-open:rotate-180 transition-transform shrink-0 ml-3" />
                </summary>
                <div className="px-5 pb-4 text-slate-400 text-sm leading-relaxed border-t border-white/[0.04] pt-3">
                  {item.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-14 sm:py-16 px-5 bg-[#0c0c10] border-t border-white/5">
        <div className="max-w-md mx-auto text-center">
          <h2 className="text-xl sm:text-2xl font-black text-white mb-2">Pronto para acessar?</h2>
          <p className="text-slate-500 text-sm mb-6">Use as credenciais fornecidas para entrar na plataforma.</p>
          <a
            href="#acesso"
            className="inline-block bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-8 py-3 rounded-xl text-sm transition-colors"
          >
            Ir para o login
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#09090c] border-t border-white/5 py-8 px-5">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="font-black text-white tracking-tight">AVELLOZ</p>
          <p className="text-xs text-slate-600 order-last sm:order-none">Gestão comercial para concessionárias de motos</p>
          <p className="text-xs text-slate-700">© 2026 Avelloz</p>
        </div>
      </footer>

    </div>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import {
  Bike, ArrowRight, LogIn, Mail, Lock,
  LayoutDashboard, CreditCard, BellRing, Users, FileDown, Filter,
  DoorOpen, GitMerge, Activity,
  ChevronDown, AlertTriangle, CheckCircle,
} from 'lucide-react'

const FEATURES = [
  { icon: LayoutDashboard, title: 'Dashboard ao vivo',        desc: 'Taxa de conversão, aprovações e vendas. Funil completo sem planilha.',             iconBg: '#FFF1EA', iconColor: '#d8550f' },
  { icon: CreditCard,      title: 'Consultas de crédito',     desc: 'Aprovado, com restrição ou negado — histórico completo por cliente.',              iconBg: '#eef2ff', iconColor: '#1B2A8B' },
  { icon: BellRing,        title: 'Lembretes de reconsulta',  desc: 'Alerta automático em 21 dias quando o crédito vence.',                            iconBg: '#fffbeb', iconColor: '#d97706' },
  { icon: Users,           title: 'Gestão de vendedores',     desc: 'Performance individual: atendimentos, consultas e conversões.',                    iconBg: '#eef2ff', iconColor: '#1B2A8B' },
  { icon: FileDown,        title: 'Relatórios',               desc: 'Exporte dados de atendimentos e resultados para análise.',                         iconBg: '#ecfdf3', iconColor: '#16a34a' },
  { icon: Filter,          title: 'Funil com status',         desc: 'Em análise, aprovado, fechado ou perdido — com motivo registrado.',                iconBg: '#FFF1EA', iconColor: '#d8550f' },
]

const STEPS = [
  { num: '01', icon: DoorOpen,  title: 'Cliente entra',         desc: 'Vendedor cadastra nome, telefone e interesse em segundos.' },
  { num: '02', icon: CreditCard, title: 'Consulta de crédito',  desc: 'Resultado registrado: aprovado, restrição ou negado.' },
  { num: '03', icon: GitMerge,  title: 'Avança no funil',       desc: 'Status atualizado em cada etapa da negociação.' },
  { num: '04', icon: Activity,  title: 'Dashboard atualizado',  desc: 'Gerente vê conversão e performance em tempo real.' },
]

const FAQS = [
  { q: 'Precisa instalar algum programa?', a: 'Não. O Avelloz é 100% web — funciona no navegador do computador, tablet ou celular.' },
  { q: 'Funciona no celular?',             a: 'Sim. Layout responsivo para o vendedor cadastrar atendimento pelo celular.' },
  { q: 'Meus dados ficam seguros?',        a: 'Sim. Criptografia e backups automáticos. Nenhum dado compartilhado com terceiros.' },
  { q: 'Posso exportar meus dados?',       a: 'Sim. Relatórios de atendimentos, consultas e performance são exportáveis.' },
  { q: 'Quanto tempo leva para começar?',  a: 'Um dia no máximo. Cadastra a loja, adiciona vendedores e começa. Sem treinamento longo.' },
]

export default function LandingPage() {
  const router = useRouter()
  const [tab, setTab] = useState<'entrar' | 'criar'>('entrar')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  function switchTab(t: 'entrar' | 'criar') {
    setTab(t); setError(''); setSuccess(''); setNome(''); setPassword(''); setConfirmPassword('')
  }

  function authClient() {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
  }

  async function ensureOrg() {
    try {
      const sb = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { db: { schema: 'avelloz' } },
      )
      await sb.rpc('ensure_org')
    } catch {}
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password.trim()) { setError('Preencha e-mail e senha'); return }
    setLoading(true); setError('')
    const { error: authError } = await authClient().auth.signInWithPassword({ email, password })
    if (authError) { setError('E-mail ou senha incorretos'); setLoading(false); return }
    await ensureOrg()
    router.push('/dashboard')
    router.refresh()
  }

  async function handleCadastro(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) { setError('Preencha todos os campos'); return }
    if (password !== confirmPassword) { setError('As senhas não coincidem'); return }
    if (password.length < 6) { setError('Mínimo 6 caracteres'); return }
    setLoading(true); setError('')
    const { data, error: authError } = await authClient().auth.signUp({ email, password, options: { data: { nome } } })
    if (authError) {
      setError(authError.message === 'User already registered' ? 'E-mail já cadastrado' : 'Erro ao criar conta. Tente novamente.')
      setLoading(false); return
    }
    if (data.session) { await ensureOrg(); router.push('/dashboard'); router.refresh(); return }
    setSuccess('Conta criada! Verifique seu e-mail para confirmar.')
    setLoading(false)
  }

  const inputCls = 'w-full h-[42px] px-[13px] rounded-[10px] border border-[#d8dee6] text-[14px] text-[#0f172a] bg-white focus:outline-none focus:ring-2 focus:ring-[#F26B21]/30 focus:border-[#F26B21] placeholder-[#94a3b8]'
  const inputShadow = { boxShadow: '0 1px 2px rgba(15,23,42,.04)' }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#0f172a]">

      {/* ── NAV ─────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-[#eef1f5]"
        style={{ background: 'rgba(248,250,252,0.88)', backdropFilter: 'blur(10px)' }}>
        <div className="max-w-[1080px] mx-auto px-5 sm:px-10 h-[66px] flex items-center justify-between">
          <div className="flex items-center gap-[11px]">
            <div className="w-9 h-9 rounded-[11px] flex items-center justify-center"
              style={{ background: 'linear-gradient(140deg,#F26B21,#d8550f)', boxShadow: '0 3px 8px rgba(242,107,33,.3),inset 0 1px 0 rgba(255,255,255,.25)' }}>
              <Bike className="w-5 h-5 text-white" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[19px] font-extrabold tracking-tight">AVELLOZ</span>
              <span className="text-[10.5px] font-semibold tracking-[.06em] uppercase"
                style={{ color: '#d8550f', background: '#FFF1EA', border: '1px solid #fbdcc9', borderRadius: '6px', padding: '2px 7px' }}>
                Gestão
              </span>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-7">
            <a href="#funcionalidades" className="text-sm font-medium text-[#475569] hover:text-[#0f172a] transition-colors">Funcionalidades</a>
            <a href="#como-funciona"   className="text-sm font-medium text-[#475569] hover:text-[#0f172a] transition-colors">Como funciona</a>
            <a href="#faq"             className="text-sm font-medium text-[#475569] hover:text-[#0f172a] transition-colors">FAQ</a>
            <a href="#acesso" className="inline-flex items-center gap-[7px] h-10 px-[17px] rounded-[10px] text-white font-semibold text-sm"
              style={{ background: '#F26B21', boxShadow: '0 1px 2px rgba(242,107,33,.45),inset 0 1px 0 rgba(255,255,255,.2)' }}>
              Acessar <ArrowRight className="w-4 h-4" />
            </a>
          </div>
          <a href="#acesso" className="sm:hidden inline-flex items-center h-9 px-[13px] rounded-[9px] text-white font-semibold text-[13px]"
            style={{ background: '#F26B21', boxShadow: '0 1px 2px rgba(242,107,33,.45)' }}>
            Acessar
          </a>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section style={{ background: 'radial-gradient(110% 80% at 88% -20%,rgba(242,107,33,.13),transparent 55%),radial-gradient(90% 90% at -10% 120%,rgba(27,42,139,.10),transparent 55%),#f8fafc' }}>
        <div className="max-w-[1080px] mx-auto px-5 sm:px-10 py-10 sm:py-16 grid grid-cols-1 sm:grid-cols-[1.08fr_.92fr] gap-10 sm:gap-14 items-center">

          {/* Copy + métricas */}
          <div>
            <div className="inline-flex items-center gap-2 bg-white border border-[#e7ebf0] rounded-full px-[13px] py-[6px] text-[12.5px] font-semibold text-[#475569] mb-[22px]"
              style={{ boxShadow: '0 1px 2px rgba(15,23,42,.04)' }}>
              <span className="w-[7px] h-[7px] rounded-full bg-[#16a34a]" style={{ boxShadow: '0 0 0 3px rgba(22,163,74,.16)' }} />
              <span className="hidden sm:inline">Controle de atendimento · Financiamento · Retorno de clientes</span>
              <span className="sm:hidden">Atendimento · Crédito · Retorno</span>
            </div>
            <h1 className="text-[34px] sm:text-[50px] font-extrabold leading-[1.03] tracking-[-0.035em] mb-[18px]">
              Sua concessionária<br />no controle total
            </h1>
            <p className="text-[15px] sm:text-[17.5px] leading-[1.55] text-[#475569] max-w-[480px] mb-8">
              Do cliente que entrou na loja até a moto saindo pela porta — funil de vendas, crédito e lembretes em um só lugar.
            </p>
            <div className="grid grid-cols-3 gap-2 sm:gap-[14px] max-w-[480px]">
              <div className="bg-white border border-[#e7ebf0] rounded-xl p-[11px] sm:p-[14px]" style={inputShadow}>
                <div className="text-[15px] sm:text-[20px] font-extrabold tracking-tight tabular-nums" style={{ color: '#d8550f' }}>21 dias</div>
                <div className="text-[10.5px] sm:text-[12px] text-[#64748b] mt-[3px] leading-[1.35]">alerta de reconsulta</div>
              </div>
              <div className="bg-white border border-[#e7ebf0] rounded-xl p-[11px] sm:p-[14px]" style={inputShadow}>
                <div className="text-[15px] sm:text-[20px] font-extrabold tracking-tight tabular-nums" style={{ color: '#1B2A8B' }}>100%</div>
                <div className="text-[10.5px] sm:text-[12px] text-[#64748b] mt-[3px] leading-[1.35]">histórico centralizado</div>
              </div>
              <div className="bg-white border border-[#e7ebf0] rounded-xl p-[11px] sm:p-[14px]" style={inputShadow}>
                <div className="text-[15px] sm:text-[20px] font-extrabold tracking-tight text-[#0f172a]">Live</div>
                <div className="text-[10.5px] sm:text-[12px] text-[#64748b] mt-[3px] leading-[1.35]"><span className="sm:hidden">dashboard</span><span className="hidden sm:inline">dashboard ao vivo</span></div>
              </div>
            </div>
          </div>

          {/* Card de acesso */}
          <div id="acesso" className="bg-white border border-[#e7ebf0] rounded-[18px] p-5 sm:p-[28px]"
            style={{ boxShadow: '0 4px 10px rgba(15,23,42,.04),0 20px 44px rgba(15,23,42,.12)' }}>
            <div className="text-[18px] font-bold tracking-tight mb-[3px]">Acesse o sistema</div>
            <div className="text-[13px] text-[#94a3b8] mb-[18px]">Entre na conta da sua loja ou crie uma nova.</div>

            {/* Abas */}
            <div className="flex gap-1 bg-[#f1f5f9] rounded-[11px] p-1 mb-5">
              {(['entrar', 'criar'] as const).map((t) => (
                <button key={t} type="button" onClick={() => switchTab(t)}
                  className="flex-1 text-center py-[9px] rounded-[9px] text-[13.5px] font-semibold transition-all"
                  style={tab === t
                    ? { background: '#fff', color: '#0f172a', boxShadow: '0 1px 2px rgba(15,23,42,.08)' }
                    : { background: 'transparent', color: '#64748b' }}>
                  {t === 'entrar' ? 'Entrar' : 'Criar conta'}
                </button>
              ))}
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 mb-4">
                <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200 mb-4">
                <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                <p className="text-sm text-green-700">{success}</p>
              </div>
            )}

            {/* Entrar */}
            {tab === 'entrar' && (
              <form onSubmit={handleLogin} className="space-y-[14px]">
                <div>
                  <label className="block text-[12.5px] font-semibold text-[#334155] mb-[6px]">E-mail</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#94a3b8] absolute left-[13px] top-[13px] pointer-events-none" />
                    <input type="email" required value={email} placeholder="voce@avelloz.com.br" autoComplete="email"
                      onChange={(e) => { setEmail(e.target.value); setError('') }}
                      className={inputCls + ' pl-[37px]'} style={inputShadow} />
                  </div>
                </div>
                <div>
                  <label className="block text-[12.5px] font-semibold text-[#334155] mb-[6px]">Senha</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#94a3b8] absolute left-[13px] top-[13px] pointer-events-none" />
                    <input type="password" required value={password} placeholder="••••••••" autoComplete="current-password"
                      onChange={(e) => { setPassword(e.target.value); setError('') }}
                      className={inputCls + ' pl-[37px]'} style={inputShadow} />
                  </div>
                </div>
                <div className="text-right -mt-1">
                  <span className="text-[12.5px] font-semibold cursor-pointer" style={{ color: '#d8550f' }}>Esqueci minha senha</span>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full h-[46px] rounded-[11px] text-white font-semibold text-[15px] flex items-center justify-center gap-2 disabled:opacity-60 transition-opacity"
                  style={{ background: '#F26B21', boxShadow: '0 4px 12px rgba(242,107,33,.34),inset 0 1px 0 rgba(255,255,255,.2)' }}>
                  {loading ? 'Entrando…' : <><span>Entrar</span><ArrowRight className="w-[17px] h-[17px]" /></>}
                </button>
              </form>
            )}

            {/* Criar conta */}
            {tab === 'criar' && !success && (
              <form onSubmit={handleCadastro} className="space-y-3">
                <div>
                  <label className="block text-[12.5px] font-semibold text-[#334155] mb-[6px]">Nome completo</label>
                  <input type="text" required value={nome} placeholder="Seu nome" autoComplete="name"
                    onChange={(e) => { setNome(e.target.value); setError('') }}
                    className={inputCls} style={inputShadow} />
                </div>
                <div>
                  <label className="block text-[12.5px] font-semibold text-[#334155] mb-[6px]">E-mail</label>
                  <input type="email" required value={email} placeholder="voce@avelloz.com.br" autoComplete="email"
                    onChange={(e) => { setEmail(e.target.value); setError('') }}
                    className={inputCls} style={inputShadow} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[12.5px] font-semibold text-[#334155] mb-[6px]">Senha</label>
                    <input type="password" required value={password} placeholder="••••••••" autoComplete="new-password"
                      onChange={(e) => { setPassword(e.target.value); setError('') }}
                      className={inputCls} style={inputShadow} />
                  </div>
                  <div>
                    <label className="block text-[12.5px] font-semibold text-[#334155] mb-[6px]">Confirmar</label>
                    <input type="password" required value={confirmPassword} placeholder="••••••••" autoComplete="new-password"
                      onChange={(e) => { setConfirmPassword(e.target.value); setError('') }}
                      className={inputCls} style={inputShadow} />
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full h-[46px] rounded-[11px] text-white font-semibold text-[15px] flex items-center justify-center gap-2 disabled:opacity-60 transition-opacity"
                  style={{ background: '#F26B21', boxShadow: '0 4px 12px rgba(242,107,33,.34),inset 0 1px 0 rgba(255,255,255,.2)' }}>
                  {loading ? 'Criando…' : <><span>Criar conta</span><ArrowRight className="w-[17px] h-[17px]" /></>}
                </button>
              </form>
            )}

            {tab === 'criar' && success && (
              <button type="button" onClick={() => switchTab('entrar')}
                className="w-full text-sm font-semibold mt-2 transition-colors" style={{ color: '#d8550f' }}>
                Ir para o login →
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ── FUNCIONALIDADES ─────────────────────────────────── */}
      <section id="funcionalidades" className="bg-white border-t border-[#eef1f5]">
        <div className="max-w-[1080px] mx-auto px-5 sm:px-10 py-10 sm:py-[72px]">
          <div className="text-center mb-[44px]">
            <div className="font-mono text-[12px] font-semibold tracking-[.12em] uppercase mb-3" style={{ color: '#d8550f' }}>Funcionalidades</div>
            <h2 className="text-[25px] sm:text-[36px] font-extrabold tracking-[-0.03em]">Tudo que sua loja precisa</h2>
          </div>
          {/* Desktop: 3 colunas */}
          <div className="hidden sm:grid grid-cols-3 gap-[18px]">
            {FEATURES.map(({ icon: Icon, title, desc, iconBg, iconColor }) => (
              <div key={title} className="bg-white border border-[#e7ebf0] rounded-[14px] p-6" style={{ boxShadow: '0 1px 2px rgba(15,23,42,.04)' }}>
                <span className="inline-flex items-center justify-center w-[46px] h-[46px] rounded-[12px]" style={{ background: iconBg, color: iconColor }}>
                  <Icon className="w-[23px] h-[23px]" />
                </span>
                <div className="text-[16.5px] font-bold mt-4 tracking-[-0.01em]">{title}</div>
                <div className="text-[13.5px] text-[#64748b] mt-[7px] leading-[1.55]">{desc}</div>
              </div>
            ))}
          </div>
          {/* Mobile: lista com ícone horizontal */}
          <div className="flex sm:hidden flex-col gap-[11px]">
            {FEATURES.map(({ icon: Icon, title, desc, iconBg, iconColor }) => (
              <div key={title} className="flex gap-[13px] bg-white border border-[#e7ebf0] rounded-[13px] p-4" style={{ boxShadow: '0 1px 2px rgba(15,23,42,.04)' }}>
                <span className="inline-flex items-center justify-center w-[42px] h-[42px] rounded-[11px] shrink-0" style={{ background: iconBg, color: iconColor }}>
                  <Icon className="w-[21px] h-[21px]" />
                </span>
                <div>
                  <div className="text-[15px] font-bold tracking-[-0.01em]">{title}</div>
                  <div className="text-[13px] text-[#64748b] mt-1 leading-[1.5]">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMO FUNCIONA ────────────────────────────────────── */}
      <section id="como-funciona" className="border-t border-[#eef1f5]" style={{ background: '#f8fafc' }}>
        <div className="max-w-[1080px] mx-auto px-5 sm:px-10 py-10 sm:py-[72px]">
          <div className="text-center mb-[44px]">
            <div className="font-mono text-[12px] font-semibold tracking-[.12em] uppercase mb-3" style={{ color: '#d8550f' }}>Como funciona</div>
            <h2 className="text-[25px] sm:text-[36px] font-extrabold tracking-[-0.03em]">Do balcão ao dashboard</h2>
          </div>
          {/* Desktop: 4 colunas */}
          <div className="hidden sm:grid grid-cols-4 gap-[18px]">
            {STEPS.map(({ num, icon: Icon, title, desc }) => (
              <div key={num} className="bg-white border border-[#e7ebf0] rounded-[14px] p-6" style={{ boxShadow: '0 1px 2px rgba(15,23,42,.04)' }}>
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono text-[13px] font-bold rounded-[8px] px-[9px] py-1" style={{ color: '#d8550f', background: '#FFF1EA' }}>{num}</span>
                  <Icon className="w-5 h-5 text-[#cbd5e1]" />
                </div>
                <div className="text-[15.5px] font-bold tracking-[-0.01em]">{title}</div>
                <div className="text-[13px] text-[#64748b] mt-[6px] leading-[1.5]">{desc}</div>
              </div>
            ))}
          </div>
          {/* Mobile: lista */}
          <div className="flex sm:hidden flex-col gap-[11px]">
            {STEPS.map(({ num, title, desc }) => (
              <div key={num} className="flex gap-[13px] items-start bg-white border border-[#e7ebf0] rounded-[13px] p-4" style={{ boxShadow: '0 1px 2px rgba(15,23,42,.04)' }}>
                <span className="font-mono text-[12px] font-bold rounded-[8px] px-[9px] py-[5px] shrink-0" style={{ color: '#d8550f', background: '#FFF1EA' }}>{num}</span>
                <div>
                  <div className="text-[14.5px] font-bold tracking-[-0.01em]">{title}</div>
                  <div className="text-[13px] text-[#64748b] mt-[3px] leading-[1.5]">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────── */}
      <section id="faq" className="bg-white border-t border-[#eef1f5]">
        <div className="max-w-[760px] mx-auto px-5 sm:px-10 py-10 sm:py-[72px]">
          <div className="text-center mb-9">
            <div className="font-mono text-[12px] font-semibold tracking-[.12em] uppercase mb-3" style={{ color: '#d8550f' }}>FAQ</div>
            <h2 className="text-[25px] sm:text-[36px] font-extrabold tracking-[-0.03em]">Perguntas frequentes</h2>
          </div>
          <div className="flex flex-col gap-[10px]">
            {FAQS.map((item, i) => (
              <div key={i} className="bg-white border border-[#e7ebf0] rounded-[13px] overflow-hidden" style={{ boxShadow: '0 1px 2px rgba(15,23,42,.03)' }}>
                <button type="button" onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between gap-4 px-5 py-[18px] text-left">
                  <span className="text-[14px] sm:text-[15px] font-semibold text-[#0f172a]">{item.q}</span>
                  <ChevronDown className="w-[18px] h-[18px] text-[#94a3b8] shrink-0 transition-transform duration-200"
                    style={{ transform: openFaq === i ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-[18px] text-[13.5px] sm:text-[14px] leading-[1.6] text-[#64748b]">{item.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ────────────────────────────────────────── */}
      <section className="border-t border-[#eef1f5]" style={{ background: '#f8fafc' }}>
        <div className="max-w-[1080px] mx-auto px-5 sm:px-10 py-10 sm:py-16">
          <div className="relative overflow-hidden rounded-[18px] sm:rounded-[22px] px-6 sm:px-12 py-9 sm:py-14 text-center"
            style={{ background: 'radial-gradient(120% 140% at 12% 0%,#F26B21 0%,#e25c14 32%,#7d3b6d 66%,#1B2A8B 100%)', boxShadow: '0 18px 44px rgba(27,42,139,.28)' }}>
            <div className="absolute inset-0 opacity-[.07]"
              style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '42px 42px' }} />
            <div className="relative">
              <h2 className="text-[24px] sm:text-[34px] font-extrabold tracking-[-0.03em] text-white mb-3">Pronto para acessar?</h2>
              <p className="text-[14px] sm:text-[16px] mb-7" style={{ color: 'rgba(255,255,255,.85)' }}>
                Entre na conta da sua loja e coloque a operação no controle.
              </p>
              <a href="#acesso" className="inline-flex items-center gap-[9px] h-[46px] sm:h-[50px] px-[22px] sm:px-[26px] rounded-[11px] sm:rounded-[12px] bg-white font-bold text-[14.5px] sm:text-[15.5px]"
                style={{ color: '#d8550f', boxShadow: '0 8px 22px rgba(13,18,55,.28)' }}>
                <LogIn className="w-[17px] sm:w-[18px] h-[17px] sm:h-[18px]" />Ir para o login
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer className="bg-white border-t border-[#eef1f5]">
        <div className="max-w-[1080px] mx-auto px-5 sm:px-10 py-[34px] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-[11px]">
            <div className="w-8 h-8 rounded-[9px] flex items-center justify-center"
              style={{ background: 'linear-gradient(140deg,#F26B21,#d8550f)' }}>
              <Bike className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-[15px] font-extrabold tracking-tight leading-none">AVELLOZ</div>
              <div className="text-[11.5px] text-[#94a3b8] mt-0.5">Gestão comercial para concessionárias de motos</div>
            </div>
          </div>
          <div className="text-[12.5px] text-[#94a3b8]">© 2026 Avelloz</div>
        </div>
      </footer>

    </div>
  )
}

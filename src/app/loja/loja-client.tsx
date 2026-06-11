'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import {
  Check, ChevronRight, MapPin, Phone, Gauge, Fuel, Zap, Usb,
  ShieldCheck, BadgeCheck, Clock, MessageCircle, Bike,
} from 'lucide-react'

// Identidade Avelloz extraída dos criativos: laranja vibrante + azul royal.
const ORANGE = '#F26B21'
const BLUE = '#1B2A8B'

const MODELOS = [
  {
    nome: 'AZ160',
    tag: 'A trail da cidade ao interior',
    img: '/motos/az160.jpeg',
    specs: ['Freio CBS e Farol LED', 'Partida elétrica · Tanque 13L', 'Painel Digital e USB', 'Injeção Eletrônica · mais potência'],
  },
  {
    nome: 'AZ125',
    tag: 'Econômica e completa',
    img: '/motos/az125.jpeg',
    specs: ['Freio a disco CBS e Farol LED', 'Partida elétrica · Tanque 5L', 'Painel Digital e USB', 'Injeção Eletrônica · Porta-Capacete'],
  },
  {
    nome: 'AZ100',
    tag: 'Leve para o dia a dia',
    img: '/motos/az100.jpeg',
    specs: ['Freio a disco e Farol LED', 'Partida elétrica · Tanque 5L', 'Painel Digital e USB', 'Aro 17" · Porta-Capacete'],
  },
]

const BENEFITS = [
  { icon: BadgeCheck, title: 'Financiamento facilitado', desc: 'Várias entradas e parcelas que cabem no seu bolso. A gente busca a melhor condição pra você.' },
  { icon: Clock, title: 'Aprovação rápida', desc: 'Consulta de crédito na hora. Você sai da loja já sabendo se está aprovado.' },
  { icon: ShieldCheck, title: 'Moto 0km com garantia', desc: 'Linha completa Avelloz, nova, com garantia de fábrica e revisão inclusa.' },
]

const WHATSAPP = '5583999999999' // placeholder — equipe Avelloz Torre vai confirmar o número

function maskPhone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length > 10) return d.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  if (d.length > 6) return d.replace(/(\d{2})(\d{4})(\d{1,4})/, '($1) $2-$3')
  if (d.length > 2) return d.replace(/(\d{2})(\d{1,5})/, '($1) $2')
  if (d.length > 0) return `(${d}`
  return ''
}

export default function LojaClient() {
  const params = useSearchParams()
  const origem = params.get('o') || 'site'

  const [form, setForm] = useState({ name: '', phone: '', interest: '', message: '' })
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  function scrollToForm() {
    document.getElementById('contato')?.scrollIntoView({ behavior: 'smooth' })
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.name.trim() || form.phone.replace(/\D/g, '').length < 10) {
      setError('Preencha seu nome e um WhatsApp válido.')
      return
    }
    setSending(true)
    try {
      const sb = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { db: { schema: 'avelloz' } },
      )
      const { error: err } = await sb.rpc('submit_lead', {
        p_code: origem,
        p_name: form.name.trim(),
        p_phone: form.phone.replace(/\D/g, ''),
        p_interest: form.interest || null,
        p_message: form.message.trim() || null,
      })
      if (err) throw err
      setSent(true)
    } catch {
      setError('Não foi possível enviar agora. Tente pelo WhatsApp.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full flex items-center justify-center" style={{ backgroundColor: BLUE }}>
              <Bike className="h-5 w-5 text-white" />
            </div>
            <div className="leading-none">
              <p className="font-black tracking-tight" style={{ color: BLUE }}>AvelloZ</p>
              <p className="text-[10px] font-semibold tracking-widest text-slate-400">MOTOS · TORRE</p>
            </div>
          </div>
          <a
            href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-2 text-sm font-bold text-white px-4 py-2 rounded-full transition-transform hover:scale-105"
            style={{ backgroundColor: ORANGE }}
          >
            <MessageCircle className="h-4 w-4" />WhatsApp
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden" style={{ backgroundColor: BLUE }}>
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full opacity-30" style={{ backgroundColor: ORANGE }} />
        <div className="absolute -left-24 bottom-0 h-80 w-80 rounded-full opacity-10 bg-white" />
        <div className="relative max-w-6xl mx-auto px-5 py-14 sm:py-20 grid lg:grid-cols-2 gap-10 items-center">
          <div className="text-white">
            <span className="inline-block text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full mb-5" style={{ backgroundColor: ORANGE }}>
              Avelloz Motos · João Pessoa
            </span>
            <h1 className="text-4xl sm:text-5xl font-black leading-[1.05]">
              Sua moto <span style={{ color: ORANGE }}>0km</span> com financiamento facilitado
            </h1>
            <p className="mt-5 text-blue-100 text-lg max-w-md">
              Na Avelloz Torre, em João Pessoa, a gente aprova seu crédito na hora e coloca você pra rodar na sua primeira moto.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button onClick={scrollToForm} className="inline-flex items-center gap-2 font-bold text-white px-6 py-3.5 rounded-full transition-transform hover:scale-105" style={{ backgroundColor: ORANGE }}>
                Quero simular agora <ChevronRight className="h-4 w-4" />
              </button>
              <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 font-bold px-6 py-3.5 rounded-full bg-white text-slate-900 transition-transform hover:scale-105">
                <MessageCircle className="h-4 w-4" />Chamar no WhatsApp
              </a>
            </div>
          </div>
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/motos/az160.jpeg" alt="Avelloz AZ160" className="w-full rounded-3xl shadow-2xl object-cover" />
          </div>
        </div>
      </section>

      {/* Benefícios */}
      <section className="max-w-6xl mx-auto px-5 py-14">
        <div className="grid sm:grid-cols-3 gap-5">
          {BENEFITS.map((b) => (
            <div key={b.title} className="rounded-2xl border border-slate-100 p-6 shadow-sm">
              <div className="h-11 w-11 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: `${ORANGE}1a` }}>
                <b.icon className="h-5 w-5" style={{ color: ORANGE }} />
              </div>
              <h3 className="font-bold text-slate-900">{b.title}</h3>
              <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Modelos */}
      <section className="bg-slate-50 py-16">
        <div className="max-w-6xl mx-auto px-5">
          <div className="text-center max-w-xl mx-auto mb-10">
            <h2 className="text-3xl font-black" style={{ color: BLUE }}>Conheça a linha Avelloz</h2>
            <p className="text-slate-500 mt-2">Motos novas, econômicas e completas — escolha a sua e simule o financiamento.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {MODELOS.map((m) => (
              <div key={m.nome} className="bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm flex flex-col">
                {/* Criativo completo da moto — sem corte (object-contain) */}
                <div className="bg-white p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.img} alt={`Avelloz ${m.nome} — ${m.tag}`} className="w-full h-auto rounded-2xl" />
                </div>
                <div className="px-6 pb-6 pt-2 flex flex-col flex-1">
                  <p className="text-sm font-medium text-center mb-3" style={{ color: ORANGE }}>{m.tag}</p>
                  <button
                    onClick={() => { setForm((f) => ({ ...f, interest: m.nome })); scrollToForm() }}
                    className="mt-auto w-full inline-flex items-center justify-center gap-2 font-bold text-white px-4 py-3 rounded-full transition-transform hover:scale-[1.02]"
                    style={{ backgroundColor: BLUE }}
                  >
                    Tenho interesse na {m.nome} <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          {/* mini specs em ícones */}
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 mt-10 text-slate-400 text-sm">
            <span className="flex items-center gap-1.5"><Zap className="h-4 w-4" />Partida elétrica</span>
            <span className="flex items-center gap-1.5"><Gauge className="h-4 w-4" />Painel digital</span>
            <span className="flex items-center gap-1.5"><Usb className="h-4 w-4" />Entrada USB</span>
            <span className="flex items-center gap-1.5"><Fuel className="h-4 w-4" />Injeção eletrônica</span>
          </div>
        </div>
      </section>

      {/* Contato / Lead form */}
      <section id="contato" className="max-w-6xl mx-auto px-5 py-16 grid lg:grid-cols-2 gap-10 items-start">
        <div>
          <h2 className="text-3xl font-black" style={{ color: BLUE }}>Simule sem compromisso</h2>
          <p className="text-slate-500 mt-2 max-w-md">
            Deixe seu contato que um consultor da Avelloz Torre fala com você pelo WhatsApp com as melhores condições.
          </p>
          <div className="mt-8 space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${BLUE}12` }}>
                <MapPin className="h-5 w-5" style={{ color: BLUE }} />
              </div>
              <div>
                <p className="font-bold text-slate-900">Avelloz Motos Torre</p>
                <p className="text-sm text-slate-500">João Pessoa — PB</p>
              </div>
            </div>
            <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 group">
              <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${ORANGE}1a` }}>
                <Phone className="h-5 w-5" style={{ color: ORANGE }} />
              </div>
              <div>
                <p className="font-bold text-slate-900 group-hover:underline">Fale agora no WhatsApp</p>
                <p className="text-sm text-slate-500">Atendimento rápido e direto</p>
              </div>
            </a>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-lg p-6 sm:p-8">
          {sent ? (
            <div className="text-center py-10">
              <div className="h-14 w-14 rounded-full mx-auto flex items-center justify-center mb-4" style={{ backgroundColor: `${ORANGE}1a` }}>
                <Check className="h-7 w-7" style={{ color: ORANGE }} />
              </div>
              <h3 className="text-xl font-black text-slate-900">Recebemos seu contato!</h3>
              <p className="text-slate-500 mt-2">Em breve um consultor da Avelloz Torre vai falar com você. Quer adiantar?</p>
              <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex items-center gap-2 font-bold text-white px-6 py-3 rounded-full" style={{ backgroundColor: ORANGE }}>
                <MessageCircle className="h-4 w-4" />Chamar no WhatsApp
              </a>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nome</label>
                <input
                  value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Seu nome completo"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-offset-0 focus:border-transparent"
                  style={{ '--tw-ring-color': ORANGE } as React.CSSProperties}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">WhatsApp</label>
                <input
                  value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: maskPhone(e.target.value) }))}
                  placeholder="(83) 90000-0000" inputMode="tel"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:border-transparent"
                  style={{ '--tw-ring-color': ORANGE } as React.CSSProperties}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Modelo de interesse</label>
                <select
                  value={form.interest} onChange={(e) => setForm((f) => ({ ...f, interest: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:border-transparent bg-white"
                  style={{ '--tw-ring-color': ORANGE } as React.CSSProperties}
                >
                  <option value="">Ainda não sei</option>
                  {MODELOS.map((m) => <option key={m.nome} value={m.nome}>{m.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Mensagem (opcional)</label>
                <textarea
                  value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                  placeholder="Ex: tenho entrada de R$ 1.000, qual a parcela?" rows={3}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:border-transparent resize-none"
                  style={{ '--tw-ring-color': ORANGE } as React.CSSProperties}
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit" disabled={sending}
                className="w-full inline-flex items-center justify-center gap-2 font-bold text-white px-6 py-3.5 rounded-full transition-transform hover:scale-[1.02] disabled:opacity-60"
                style={{ backgroundColor: ORANGE }}
              >
                {sending ? 'Enviando...' : <>Quero que me chamem <ChevronRight className="h-4 w-4" /></>}
              </button>
              <p className="text-xs text-slate-400 text-center">Seus dados são usados só para o atendimento da Avelloz Torre.</p>
            </form>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="text-white" style={{ backgroundColor: BLUE }}>
        <div className="max-w-6xl mx-auto px-5 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full flex items-center justify-center" style={{ backgroundColor: ORANGE }}>
              <Bike className="h-5 w-5 text-white" />
            </div>
            <div className="leading-none">
              <p className="font-black tracking-tight">AvelloZ Motos</p>
              <p className="text-[11px] text-blue-200">Torre · João Pessoa — PB</p>
            </div>
          </div>
          <p className="text-sm text-blue-200">© {new Date().getFullYear()} Avelloz Motos Torre. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  )
}

'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { driver, type DriveStep } from 'driver.js'
import 'driver.js/dist/driver.css'

const TOUR_KEY = 'avelloz_tour_v1'

// Passos do tour. No desktop destacam os itens da sidebar; no mobile (sidebar
// escondida) viram popovers centrais com o mesmo texto.
function buildSteps(isDesktop: boolean): DriveStep[] {
  const sidebarStep = (selector: string, title: string, description: string): DriveStep =>
    isDesktop
      ? { element: selector, popover: { title, description, side: 'right', align: 'start' } }
      : { popover: { title, description } }

  return [
    {
      popover: {
        title: '👋 Bem-vindo ao Avelloz',
        description:
          'Em 1 minuto eu te mostro como controlar atendimentos, consultas de crédito e recuperar clientes. Vamos lá?',
      },
    },
    sidebarStep(
      '[data-tour="nav-configuracoes"]',
      '1. Cadastre seus vendedores',
      'Comece por aqui. Em Configurações → Vendedores você cadastra sua equipe — todo atendimento é vinculado a um vendedor.',
    ),
    sidebarStep(
      '[data-tour="nav-atendimentos"]',
      '2. Registre os atendimentos',
      'Cada cliente que entra na loja vira um atendimento. Você registra a moto de interesse e a consulta de crédito dele.',
    ),
    {
      popover: {
        title: '3. O desfecho de cada consulta',
        description:
          'Crédito <b>aprovado</b>? Marque se a venda foi fechada, perdida ou está aguardando. <b>Negado/restrição</b>? O sistema agenda a reconsulta em 21 dias automaticamente.',
      },
    },
    sidebarStep(
      '[data-tour="nav-lembretes"]',
      '4. Lembretes automáticos',
      'Reconsultas e cobranças de fechamento aparecem aqui no prazo certo — com botão de WhatsApp pra falar com o cliente na hora.',
    ),
    sidebarStep(
      '[data-tour="nav-dashboard"]',
      '5. Acompanhe os números',
      'No Dashboard você vê o funil de conversão e os leads aprovados aguardando fechamento — o dinheiro na mesa.',
    ),
    {
      popover: {
        title: '✅ Pronto pra começar!',
        description:
          'Seu primeiro passo: cadastrar um vendedor. Pode refazer este tour quando quiser pelo botão <b>Tutorial</b> no menu.',
      },
    },
  ]
}

function runTour() {
  const isDesktop = typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches
  const d = driver({
    showProgress: true,
    nextBtnText: 'Próximo',
    prevBtnText: 'Voltar',
    doneBtnText: 'Concluir',
    progressText: '{{current}} de {{total}}',
    steps: buildSteps(isDesktop),
    onDestroyed: () => {
      try { localStorage.setItem(TOUR_KEY, '1') } catch {}
    },
  })
  d.drive()
}

export function Tour() {
  const pathname = usePathname()

  // Primeira visita ao dashboard → inicia o tour automaticamente
  useEffect(() => {
    if (pathname !== '/dashboard') return
    let done = false
    try { done = localStorage.getItem(TOUR_KEY) === '1' } catch {}
    if (done) return
    const t = setTimeout(runTour, 700)
    return () => clearTimeout(t)
  }, [pathname])

  // Botão "Tutorial" no menu dispara o tour manualmente
  useEffect(() => {
    const handler = () => runTour()
    window.addEventListener('avelloz:start-tour', handler)
    return () => window.removeEventListener('avelloz:start-tour', handler)
  }, [])

  return null
}

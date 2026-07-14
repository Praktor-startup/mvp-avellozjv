import { Suspense } from 'react'
import type { Metadata } from 'next'
import LojaClient from './loja-client'

export const metadata: Metadata = {
  title: 'Grupo Sempre Motos — Bayeux, PB | Sua moto 0km com financiamento facilitado',
  description:
    'Conheça as motos Avelloz no Grupo Sempre Motos, em Bayeux — PB. AZ160, AZ125 e AZ100 com injeção eletrônica, partida elétrica e financiamento facilitado. Fale com a gente agora.',
  openGraph: {
    title: 'Grupo Sempre Motos — Bayeux, PB',
    description: 'Sua moto 0km com financiamento facilitado em Bayeux — PB.',
    images: ['/motos/az160.jpeg'],
    type: 'website',
  },
}

export default function LojaPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0b1437]" />}>
      <LojaClient />
    </Suspense>
  )
}

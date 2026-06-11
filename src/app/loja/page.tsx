import { Suspense } from 'react'
import type { Metadata } from 'next'
import LojaClient from './loja-client'

export const metadata: Metadata = {
  title: 'Avelloz Motos Torre — João Pessoa | Sua moto 0km com financiamento facilitado',
  description:
    'Conheça as motos Avelloz na loja Torre, em João Pessoa. AZ160, AZ125 e AZ100 com injeção eletrônica, partida elétrica e financiamento facilitado. Fale com a gente agora.',
  openGraph: {
    title: 'Avelloz Motos Torre — João Pessoa',
    description: 'Sua moto 0km com financiamento facilitado em João Pessoa.',
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

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { UserCog, Users, Bike, Tag, AlertCircle, Megaphone } from 'lucide-react'

const TABS = [
  { href: '/configuracoes/equipe', label: 'Equipe', icon: UserCog },
  { href: '/configuracoes/vendedores', label: 'Vendedores', icon: Users },
  { href: '/configuracoes/motos', label: 'Tipos de Moto', icon: Bike },
  { href: '/configuracoes/status', label: 'Status', icon: Tag },
  { href: '/configuracoes/motivos-perda', label: 'Motivos de Perda', icon: AlertCircle },
  { href: '/configuracoes/canais', label: 'Canal de Origem', icon: Megaphone },
]

export default function ConfiguracoesLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 overflow-x-auto shrink-0">
        <nav className="flex gap-1 -mb-px min-w-max">
          {TABS.map((tab) => {
            const active = pathname === tab.href || pathname.startsWith(tab.href + '/')
            const Icon = tab.icon
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  'flex items-center gap-1.5 px-3.5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                  active
                    ? 'border-brand-600 text-brand-700'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </Link>
            )
          })}
        </nav>
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  )
}

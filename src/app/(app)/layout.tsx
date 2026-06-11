'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Sidebar } from '@/components/layout/sidebar'
import { Tour } from '@/components/onboarding/tour'
import { createClient } from '@/lib/supabase/client'
import { Menu, Bell, HelpCircle } from 'lucide-react'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Garante que o usuário tenha uma organização (loja) com config semeada.
  // Idempotente: se já é membro de uma loja, só retorna a org; senão cria.
  // Rede de segurança para sessões já autenticadas que não passaram pelo login agora.
  useEffect(() => {
    createClient().rpc('ensure_org').then(() => {}, () => {})
  }, [])

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden" suppressHydrationWarning>
      <Tour />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Barra mobile */}
        <header className="lg:hidden h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between shrink-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors -ml-1"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-indigo-600 flex items-center justify-center">
              <span className="text-white text-xs font-black">A</span>
            </div>
            <span className="text-sm font-bold text-slate-900">Avelloz</span>
          </div>
          <div className="flex items-center -mr-1">
            <button
              onClick={() => window.dispatchEvent(new Event('avelloz:start-tour'))}
              aria-label="Refazer tutorial"
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
            <Link
              href="/lembretes"
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
            >
              <Bell className="w-5 h-5" />
            </Link>
          </div>
        </header>

        <main className="flex-1 flex flex-col overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  )
}

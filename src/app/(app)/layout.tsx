'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { Tour } from '@/components/onboarding/tour'
import { createClient } from '@/lib/supabase/client'
import { Menu, Bell, HelpCircle, Lock } from 'lucide-react'

// Rotas de gestão da loja — bloqueadas para vendedor (que só usa o próprio acesso)
const ADMIN_PREFIXES = ['/equipe', '/vendedores', '/motos', '/status', '/motivos-perda', '/leads', '/origens']

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [role, setRole] = useState<'loading' | string | null>('loading')
  const pathname = usePathname()

  // Garante org (idempotente) e descobre o papel do usuário na loja.
  // Rede de segurança para sessões já autenticadas que não passaram pelo login agora.
  useEffect(() => {
    (async () => {
      const sb = createClient()
      try { await sb.rpc('ensure_org') } catch {}
      try {
        const { data } = await sb.rpc('my_role')
        setRole((data as string) ?? null)
      } catch { setRole(null) }
    })()
  }, [])

  const isGestor = role === 'gestor' || role === 'tecnico'
  const isAdminRoute = ADMIN_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'))
  const blocked = isAdminRoute && role !== 'loading' && !isGestor

  const restricted = (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
          <Lock className="h-6 w-6 text-slate-400" />
        </div>
        <h2 className="text-base font-semibold text-slate-900">Acesso restrito</h2>
        <p className="text-sm text-slate-500 mt-1">
          Esta área é exclusiva de gestores. Como vendedor, você acessa seus próprios atendimentos e lembretes.
        </p>
        <Link href="/dashboard" className="inline-block mt-4 text-sm font-medium text-indigo-600 hover:underline">
          Voltar ao início
        </Link>
      </div>
    </div>
  )

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
          {blocked
            ? restricted
            : isAdminRoute && role === 'loading'
              ? null
              : children}
        </main>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard,
  ClipboardList,
  Bell,
  Users,
  Bike,
  Tag,
  AlertCircle,
  BarChart2,
  LogOut,
  X,
  HelpCircle,
  QrCode,
  Inbox,
  UserCog,
} from 'lucide-react'

type NavItem =
  | { divider: true }
  | { label: string; href: string; icon: typeof LayoutDashboard; tour?: string; badge?: boolean; gestorOnly?: boolean }

const nav: NavItem[] = [
  // Acesso de todos (inclusive vendedor — escopo dos próprios dados via RLS)
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, tour: 'nav-dashboard' },
  { label: 'Atendimentos', href: '/atendimentos', icon: ClipboardList, tour: 'nav-atendimentos' },
  { label: 'Lembretes', href: '/lembretes', icon: Bell, badge: true, tour: 'nav-lembretes' },
  { divider: true },
  // Gestão da loja — só gestor/técnico (vendedor não vê)
  { label: 'Leads', href: '/leads', icon: Inbox, gestorOnly: true, tour: 'nav-leads' },
  { label: 'Captação (QR)', href: '/origens', icon: QrCode, gestorOnly: true, tour: 'nav-origens' },
  { divider: true },
  { label: 'Relatórios', href: '/relatorios', icon: BarChart2 },
  { divider: true },
  { label: 'Equipe', href: '/equipe', icon: UserCog, gestorOnly: true, tour: 'nav-equipe' },
  { label: 'Vendedores', href: '/vendedores', icon: Users, gestorOnly: true, tour: 'nav-vendedores' },
  { label: 'Tipos de Moto', href: '/motos', icon: Bike, gestorOnly: true },
  { label: 'Status', href: '/status', icon: Tag, gestorOnly: true },
  { label: 'Motivos de Perda', href: '/motivos-perda', icon: AlertCircle, gestorOnly: true },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [pendingCount, setPendingCount] = useState(0)
  const [orgName, setOrgName] = useState<string>('Gestão comercial')
  const [isGestor, setIsGestor] = useState<boolean | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('reminders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
      .then(({ count }) => setPendingCount(count ?? 0))
    supabase
      .from('organizations')
      .select('name')
      .limit(1)
      .then(({ data }) => { if (data && data[0]) setOrgName(data[0].name as string) })
    supabase.rpc('my_role').then(({ data }) => {
      setIsGestor(data === 'gestor' || data === 'tecnico')
    })
  }, [pathname])

  // Fecha o drawer ao navegar no mobile
  useEffect(() => { onClose() }, [pathname])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  // Remove itens só-de-gestor para vendedor e colapsa divisores órfãos/duplicados
  const visibleNav: NavItem[] = []
  for (const item of nav) {
    if (!('divider' in item) && item.gestorOnly && !isGestor) continue
    if ('divider' in item && (visibleNav.length === 0 || 'divider' in visibleNav[visibleNav.length - 1])) continue
    visibleNav.push(item)
  }
  while (visibleNav.length && 'divider' in visibleNav[visibleNav.length - 1]) visibleNav.pop()

  const inner = (
    <aside className="w-64 shrink-0 bg-white border-r border-slate-200 flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-brand-600 flex items-center justify-center shrink-0">
            <Bike className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900 leading-none">Avelloz</p>
            <p className="text-xs text-slate-500 mt-0.5 truncate" title={orgName}>{orgName}</p>
          </div>
        </div>
        {/* Botão fechar só no mobile */}
        <button
          onClick={onClose}
          className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {visibleNav.map((item, i) => {
          if ('divider' in item) return <div key={`d${i}`} className="my-2 border-t border-slate-100" />

          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              data-tour={(item as { tour?: string }).tour}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group',
                isActive
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              )}
            >
              <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-brand-600' : 'text-slate-400 group-hover:text-slate-600')} />
              <span className="flex-1">{item.label}</span>
              {item.badge && pendingCount > 0 && (
                <span className="h-5 min-w-5 px-1 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center">
                  {pendingCount > 99 ? '99+' : pendingCount}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-slate-100 space-y-0.5">
        <button
          onClick={() => window.dispatchEvent(new Event('avelloz:start-tour'))}
          className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
        >
          <HelpCircle className="h-4 w-4 shrink-0" />
          Tutorial
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sair
        </button>
      </div>
    </aside>
  )

  return (
    <>
      {/* Desktop: sempre visível */}
      <div className="hidden lg:flex h-screen sticky top-0">
        {inner}
      </div>

      {/* Mobile: drawer */}
      {open && (
        <>
          {/* Overlay */}
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          {/* Drawer */}
          <div className="lg:hidden fixed inset-y-0 left-0 z-50 flex">
            {inner}
          </div>
        </>
      )}
    </>
  )
}

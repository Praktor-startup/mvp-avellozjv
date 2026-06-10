'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Sidebar } from '@/components/layout/sidebar'
import { Menu, Bell } from 'lucide-react'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden" suppressHydrationWarning>
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
          <Link
            href="/lembretes"
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors -mr-1"
          >
            <Bell className="w-5 h-5" />
          </Link>
        </header>

        <main className="flex-1 flex flex-col overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  )
}

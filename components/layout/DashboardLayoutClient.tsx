'use client'

import { useState } from 'react'
import { Menu } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home, Brain, LayoutDashboard, ClipboardList, Bell,
  type LucideIcon,
} from 'lucide-react'
import Sidebar from '@/components/sidebar/Sidebar'
import { cn } from '@/lib/utils'
import type { KiraUser } from '@/lib/types'

interface Props {
  user: Pick<KiraUser, 'name' | 'role' | 'email'> | null
  children: React.ReactNode
}

const BOTTOM_NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/',            label: 'Inicio',    icon: Home          },
  { href: '/research',    label: 'Research',  icon: Brain         },
  { href: '/dashboard',   label: 'Dashboard', icon: LayoutDashboard },
  { href: '/work-orders', label: 'OTs',       icon: ClipboardList },
  { href: '/notices',     label: 'Avisos',    icon: Bell          },
]

export default function DashboardLayoutClient({ user, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  function isActive(href: string) {
    if (href === '/' || href === '/dashboard') return pathname === href
    return pathname.startsWith(href)
  }

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">

      {/* ── Mobile backdrop ──────────────────────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <Sidebar
        user={user}
        isMobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
      />

      {/* ── Main ─────────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">

        {/* Mobile top bar */}
        <div className="flex-shrink-0 flex items-center gap-3 px-4 h-14
                        bg-slate-950/95 backdrop-blur-sm border-b border-slate-800/80
                        md:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200
                       hover:bg-slate-800 transition-colors"
            aria-label="Abrir menú"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full overflow-hidden ring-1 ring-sky-500/30 flex-shrink-0">
              <img
                src="/kira-avatar-2.jpg"
                alt="KIRA"
                className="w-full h-full object-cover object-top"
              />
            </div>
            <span className="text-sm font-bold text-white tracking-wide">KIRA</span>
          </div>
        </div>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto pb-16 md:pb-0">
          {children}
        </div>
      </main>

      {/* ── Mobile bottom nav ─────────────────────────────────────────────── */}
      <nav className="fixed bottom-0 inset-x-0 h-16 bg-slate-900 border-t border-slate-700/60
                      flex items-center justify-around z-30 md:hidden">
        {BOTTOM_NAV.map(({ href, label, icon: Icon }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors"
            >
              <Icon
                className={cn(
                  'w-5 h-5 transition-colors',
                  active ? 'text-sky-400' : 'text-slate-500'
                )}
              />
              <span className={cn(
                'text-[10px] font-medium transition-colors',
                active ? 'text-sky-400' : 'text-slate-600'
              )}>
                {label}
              </span>
            </Link>
          )
        })}
      </nav>

    </div>
  )
}

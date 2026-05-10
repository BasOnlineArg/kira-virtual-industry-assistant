'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard,
  Brain,
  Camera,
  Activity,
  Gauge,
  Building2,
  MapPin,
  ClipboardList,
  Bell,
  BookOpen,
  Settings,
  Database,
  GitBranch,
  LogOut,
  User,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  type LucideIcon,
} from 'lucide-react'
import { logout } from '@/app/actions/auth'
import { cn } from '@/lib/utils'
import type { KiraUser } from '@/lib/types'

// ─── Nav data ─────────────────────────────────────────────────────────────────

interface NavItem {
  href:           string
  label:          string
  icon:           LucideIcon
  superusuario?:  boolean
}

const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: 'ANÁLISIS',
    items: [
      { href: '/research',          label: 'AI Research',          icon: Brain },
      { href: '/visual-inspection', label: 'Inspección Visual',    icon: Camera },
      { href: '/audio-vibration',   label: 'Audio & Vibración',    icon: Activity },
      { href: '/skf',               label: 'SKF QuickCollect',     icon: Gauge },
    ],
  },
  {
    label: 'OPERACIONES',
    items: [
      { href: '/structural-inspections', label: 'Insp. Estructurales',    icon: Building2 },
      { href: '/geo',                     label: 'Geolocalización',         icon: MapPin },
      { href: '/work-orders',            label: 'Órdenes de Trabajo',      icon: ClipboardList },
      { href: '/notices',                label: 'Avisos de Mantenimiento', icon: Bell },
      { href: '/rca',                    label: 'Análisis RCA',            icon: GitBranch },
    ],
  },
  {
    label: 'SISTEMA',
    items: [
      { href: '/manuals',    label: 'Biblioteca Manuales',       icon: BookOpen },
      { href: '/auxiliares', label: 'Datos y Tablas Auxiliares', icon: Database },
      { href: '/dashboard',  label: 'Dashboard',                  icon: LayoutDashboard },
      { href: '/admin',      label: 'Administración',             icon: Settings, superusuario: true },
    ],
  },
]

const roleLabels: Record<string, string> = {
  superusuario: 'Superusuario',
  inspector:    'Inspector',
  supervisor:   'Supervisor',
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface SidebarProps {
  user:           Pick<KiraUser, 'name' | 'role' | 'email'> | null
  isMobileOpen?:  boolean
  onMobileClose?: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Sidebar({ user, isMobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname       = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const isSuperusuario = user?.role === 'superusuario'

  // Close mobile sidebar on route change
  useEffect(() => {
    onMobileClose?.()
  }, [pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  const visibleGroups = navGroups.map((g) => ({
    ...g,
    items: g.items.filter((item) => !item.superusuario || isSuperusuario),
  }))

  const allNavItems = visibleGroups.flatMap((g) => g.items)

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <aside
      className={cn(
        // Base
        'bg-slate-900 border-r border-slate-700/40 flex flex-col z-50 overflow-hidden',
        'transition-all duration-300',
        // Mobile: fixed full-height drawer from left
        'fixed inset-y-0 left-0 h-full w-72',
        isMobileOpen ? 'translate-x-0 shadow-2xl shadow-black/60' : '-translate-x-full',
        // md+: static sidebar, always visible, no transform
        'md:static md:translate-x-0 md:h-screen md:sticky md:top-0 md:shadow-none md:flex-shrink-0',
        // Width on md+
        collapsed ? 'md:w-16' : 'md:w-64',
      )}
    >
      {/* ── Logo + toggle ─────────────────────────────────────────────────── */}
      <div
        className={cn(
          'border-b border-slate-700/40 flex items-center flex-shrink-0',
          collapsed ? 'flex-col gap-1 py-4 px-2' : 'px-4 py-5 gap-3'
        )}
      >
        {/* Logo → home */}
        <Link
          href="/"
          className={cn('flex items-center gap-3 flex-shrink-0', collapsed && 'justify-center')}
        >
          <div
            className="rounded-xl overflow-hidden shadow-lg shadow-sky-600/30 flex-shrink-0 ring-1 ring-sky-500/30"
            style={{ width: 72, height: 72 }}
          >
            <img
              src="/kira-avatar-2.jpg"
              alt="KIRA"
              width={72}
              height={72}
              className="w-full h-full object-cover object-top"
            />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="text-white font-bold text-base leading-none tracking-wide">KIRA</h1>
              <p className="text-slate-500 text-[11px] mt-0.5">Asistente Industrial</p>
            </div>
          )}
        </Link>

        {/* Mobile close / Desktop collapse toggle */}
        <button
          onClick={() => {
            if (isMobileOpen) onMobileClose?.()
            else setCollapsed((c) => !c)
          }}
          className={cn(
            'text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg p-1.5 transition-colors flex-shrink-0',
            !collapsed && 'ml-auto'
          )}
          title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
        >
          {/* Mobile: show X; desktop: show panel toggle */}
          <span className="md:hidden"><X className="w-4 h-4" /></span>
          <span className="hidden md:block">
            {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </span>
        </button>
      </div>

      {/* ── Navigation ────────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-6 px-2">
        {collapsed ? (
          <div className="space-y-0.5">
            {allNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={cn(
                  'flex items-center justify-center p-2.5 rounded-lg transition-colors',
                  isActive(item.href)
                    ? 'bg-sky-600/15 text-sky-400'
                    : 'text-slate-500 hover:text-slate-200 hover:bg-slate-800'
                )}
              >
                <item.icon className="w-5 h-5" />
              </Link>
            ))}
          </div>
        ) : (
          visibleGroups.map((group) => (
            <div key={group.label}>
              <p className="px-3 mb-1.5 text-[10px] font-semibold text-slate-600 tracking-widest uppercase">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors group',
                      isActive(item.href)
                        ? 'bg-sky-600/15 text-sky-400 font-medium'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
                    )}
                  >
                    <item.icon
                      className={cn(
                        'w-4 h-4 flex-shrink-0 transition-colors',
                        isActive(item.href) ? 'text-sky-400' : 'text-slate-500 group-hover:text-slate-300'
                      )}
                    />
                    <span className="truncate">{item.label}</span>
                    {isActive(item.href) && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-sky-400 flex-shrink-0" />
                    )}
                  </Link>
                ))}
              </div>
            </div>
          ))
        )}
      </nav>

      {/* ── User + Logout ─────────────────────────────────────────────────── */}
      <div
        className={cn(
          'border-t border-slate-700/40 flex-shrink-0',
          collapsed ? 'py-3 px-2 flex flex-col items-center gap-2' : 'px-3 py-4'
        )}
      >
        {collapsed ? (
          <>
            <div
              className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center"
              title={user?.name ?? 'Usuario'}
            >
              <User className="w-4 h-4 text-slate-300" />
            </div>
            <form action={logout}>
              <button type="submit" title="Cerrar sesión"
                className="text-slate-600 hover:text-red-400 transition-colors p-1">
                <LogOut className="w-4 h-4" />
              </button>
            </form>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3 px-2 mb-3">
              <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-slate-300" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-200 truncate leading-tight">
                  {user?.name ?? 'Usuario'}
                </p>
                <p className="text-xs text-slate-500 leading-tight mt-0.5">
                  {user?.role ? roleLabels[user.role] : '—'}
                </p>
              </div>
            </div>
            <form action={logout}>
              <button
                type="submit"
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-500
                           hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Cerrar sesión
              </button>
            </form>
          </>
        )}
      </div>
    </aside>
  )
}

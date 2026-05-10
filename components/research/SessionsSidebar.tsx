'use client'

import { PlusCircle, MessageSquare, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Session {
  id: string
  titulo: string
  created_at: string
  updated_at: string
}

function relativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'ahora'
  if (minutes < 60) return `hace ${minutes}m`
  if (hours < 24) return `hace ${hours}h`
  if (days === 1) return 'ayer'
  if (days < 7) return `hace ${days}d`
  return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}

interface SessionsSidebarProps {
  sessions: Session[]
  activeSessionId: string | null
  onNewSession: () => void
  onSelectSession: (id: string) => void
  onDeleteSession: (id: string) => void
  isOpen?: boolean
  onClose?: () => void
}

export default function SessionsSidebar({
  sessions,
  activeSessionId,
  onNewSession,
  onSelectSession,
  onDeleteSession,
  isOpen = false,
  onClose,
}: SessionsSidebarProps) {
  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'bg-slate-900/60 border-l border-slate-700/40 flex flex-col',
          // Mobile: fixed overlay from the right, toggled by isOpen
          'fixed top-0 right-0 h-full w-72 z-30 transition-transform duration-300 md:hidden',
          isOpen ? 'translate-x-0' : 'translate-x-full',
          // md+: static sidebar, always visible
          'md:static md:translate-x-0 md:w-60 md:flex-shrink-0 md:h-auto md:z-auto md:transition-none',
        )}
      >
      {/* Header */}
      <div className="px-3 py-4 border-b border-slate-700/40">
        <div className="flex items-center justify-between px-1 mb-2">
          <p className="text-[10px] font-semibold text-slate-600 tracking-widest uppercase">
            Sesiones
          </p>
          <button
            onClick={onClose}
            className="md:hidden p-1 text-slate-500 hover:text-slate-300 transition-colors rounded"
            title="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <button
          onClick={onNewSession}
          className="w-full flex items-center gap-2 px-3 py-2 bg-sky-600 hover:bg-sky-500
                     text-white text-sm font-medium rounded-lg transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          Nueva sesión
        </button>
      </div>

      {/* List */}
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-3">
            <MessageSquare className="w-8 h-8 text-slate-700 mb-2" />
            <p className="text-xs text-slate-600">
              Creá una sesión para empezar.
            </p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={cn(
                  'group flex items-start gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors',
                  activeSessionId === session.id
                    ? 'bg-sky-600/15 text-sky-300'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                )}
                onClick={() => onSelectSession(session.id)}
              >
                <MessageSquare
                  className={cn(
                    'w-3.5 h-3.5 flex-shrink-0 mt-0.5',
                    activeSessionId === session.id ? 'text-sky-400' : 'text-slate-600'
                  )}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium leading-snug break-words line-clamp-2">
                    {session.titulo}
                  </p>
                  <p className="text-[10px] text-slate-600 mt-0.5">
                    {relativeTime(session.updated_at)}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteSession(session.id)
                  }}
                  className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-0.5
                             text-slate-600 hover:text-red-400 transition-all rounded"
                  title="Eliminar sesión"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-slate-700/40">
        <p className="text-[10px] text-slate-700">
          {sessions.length} {sessions.length === 1 ? 'sesión' : 'sesiones'} guardadas
        </p>
      </div>
    </aside>
    </>
  )
}

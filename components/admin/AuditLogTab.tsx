'use client'

import { useState, useCallback } from 'react'
import { Search, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AuditEntry {
  id:         string
  user_email: string
  action:     string
  module:     string
  entity_id:  string | null
  metadata:   Record<string, unknown> | null
  created_at: string
}

const ACTION_STYLES: Record<string, string> = {
  CHANGE_ROLE:      'bg-violet-500/15 text-violet-400',
  TOGGLE_ACTIVE:    'bg-sky-500/15    text-sky-400',
  WHITELIST_ADD:    'bg-emerald-500/15 text-emerald-400',
  WHITELIST_REMOVE: 'bg-red-500/15    text-red-400',
}

function ActionBadge({ action }: { action: string }) {
  const cls = ACTION_STYLES[action] ?? 'bg-slate-700/50 text-slate-400'
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0', cls)}>
      {action.replace(/_/g, ' ')}
    </span>
  )
}

export default function AuditLogTab({ initialLogs }: { initialLogs: AuditEntry[] }) {
  const [logs, setLogs]         = useState(initialLogs)
  const [loading, setLoading]   = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [filters, setFilters]   = useState({ user_email: '', module: '', from: '', to: '' })

  const fetchLogs = useCallback(async (f = filters) => {
    setLoading(true)
    const params = new URLSearchParams({ limit: '200' })
    if (f.user_email) params.set('user_email', f.user_email)
    if (f.module)     params.set('module',      f.module)
    if (f.from)       params.set('from',         f.from)
    if (f.to)         params.set('to',           f.to)

    const res = await fetch(`/api/admin/audit-logs?${params}`)
    if (res.ok) setLogs(await res.json())
    setLoading(false)
  }, [filters])

  function handleFilter(k: string, v: string) {
    setFilters((prev) => ({ ...prev, [k]: v }))
  }

  return (
    <div className="flex flex-col gap-4">

      {/* Filters */}
      <div className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-4 flex flex-wrap gap-2 items-end">
        <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
          <label className="text-[10px] uppercase tracking-wider text-slate-500">Usuario</label>
          <input
            value={filters.user_email}
            onChange={(e) => handleFilter('user_email', e.target.value)}
            placeholder="email..."
            className="rounded-lg bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs text-slate-300
                       placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>
        <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
          <label className="text-[10px] uppercase tracking-wider text-slate-500">Módulo</label>
          <select
            value={filters.module}
            onChange={(e) => handleFilter('module', e.target.value)}
            className="rounded-lg bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs text-slate-300
                       focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            <option value="">Todos</option>
            <option value="admin.users">admin.users</option>
            <option value="admin.whitelist">admin.whitelist</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wider text-slate-500">Desde</label>
          <input
            type="date"
            value={filters.from}
            onChange={(e) => handleFilter('from', e.target.value)}
            className="rounded-lg bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs text-slate-300
                       focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wider text-slate-500">Hasta</label>
          <input
            type="date"
            value={filters.to}
            onChange={(e) => handleFilter('to', e.target.value)}
            className="rounded-lg bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs text-slate-300
                       focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>
        <button
          onClick={() => fetchLogs()}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500
                     disabled:opacity-50 text-white text-xs font-medium transition-colors"
        >
          <Search className="w-3.5 h-3.5" />
          Filtrar
        </button>
        <button
          onClick={() => { setFilters({ user_email: '', module: '', from: '', to: '' }); fetchLogs({ user_email: '', module: '', from: '', to: '' }) }}
          disabled={loading}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-300 hover:bg-slate-700 transition-colors"
          title="Limpiar filtros"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
        </button>
      </div>

      {/* Log table */}
      <div className="overflow-x-auto">
      <div className="flex flex-col gap-1.5 min-w-[320px]">
        {logs.length === 0 && (
          <p className="text-sm text-slate-500 text-center py-10">Sin registros para los filtros aplicados.</p>
        )}
        {logs.map((log) => (
          <div key={log.id} className="rounded-xl border border-slate-700/40 bg-slate-800/30 overflow-hidden">
            <button
              onClick={() => setExpanded(expanded === log.id ? null : log.id)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-700/20 transition-colors"
            >
              {expanded === log.id
                ? <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                : <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              }
              <span className="text-xs text-slate-400 shrink-0 font-mono">
                {new Date(log.created_at).toLocaleString('es-AR', {
                  day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                })}
              </span>
              <span className="flex-1 text-xs text-slate-300 truncate">{log.user_email}</span>
              <span className="text-[11px] text-slate-500 shrink-0 hidden sm:block">{log.module}</span>
              <ActionBadge action={log.action} />
            </button>
            {expanded === log.id && (
              <div className="px-4 pb-3 pt-1 border-t border-slate-700/40">
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  {log.entity_id && (
                    <>
                      <span className="text-slate-500">ID entidad</span>
                      <span className="text-slate-300 font-mono text-[11px]">{log.entity_id}</span>
                    </>
                  )}
                  {log.metadata && Object.entries(log.metadata).map(([k, v]) => (
                    <>
                      <span key={k + '_k'} className="text-slate-500">{k}</span>
                      <span key={k + '_v'} className="text-slate-300">{String(v)}</span>
                    </>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      </div>{/* end overflow-x-auto */}

    </div>
  )
}

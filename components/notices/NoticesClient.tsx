'use client'

import { useState, useMemo, useCallback } from 'react'
import { Printer, Search, X, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'
import AvisoForm from './AvisoForm'
import AvisoCard from './AvisoCard'
import AvisoKpiBar from './AvisoKpiBar'
import {
  PRIORIDAD_CONFIG, EJECUTANTE_CONFIG,
  type Aviso, type Prioridad, type Ejecutante,
} from '@/lib/notices/types'

const PRIORIDADES = Object.keys(PRIORIDAD_CONFIG) as Prioridad[]
const EJECUTANTES = Object.keys(EJECUTANTE_CONFIG) as Ejecutante[]

interface Props {
  initialAvisos: Aviso[]
}

export default function NoticesClient({ initialAvisos }: Props) {
  const [avisos, setAvisos]         = useState<Aviso[]>(initialAvisos)
  const [search, setSearch]         = useState('')
  const [filterPrio, setFilterPrio] = useState<Prioridad | 'all'>('all')
  const [filterEsp, setFilterEsp]   = useState<Ejecutante | 'all'>('all')
  const [showDone, setShowDone]     = useState(true)

  // ── Create aviso ────────────────────────────────────────────────────────────
  const handleSave = useCallback(async (aviso: Aviso) => {
    try {
      const res = await fetch('/api/notices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(aviso),
      })
      if (!res.ok) throw new Error(await res.text())
      const saved = await res.json() as Aviso
      setAvisos((prev) => [saved, ...prev])
    } catch (e) {
      console.error('[Notices] save error', e)
    }
  }, [])

  // ── Toggle generadoSAP ──────────────────────────────────────────────────────
  const handleToggleSAP = useCallback(async (id: string) => {
    const aviso = avisos.find((a) => a.id === id)
    if (!aviso) return
    const newVal = !aviso.generadoSAP

    // Optimistic update
    setAvisos((prev) => prev.map((a) => a.id === id ? { ...a, generadoSAP: newVal } : a))

    try {
      const res = await fetch('/api/notices', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, generadoSAP: newVal }),
      })
      if (!res.ok) throw new Error(await res.text())
      const updated = await res.json() as Aviso
      setAvisos((prev) => prev.map((a) => a.id === id ? updated : a))
    } catch (e) {
      console.error('[Notices] toggle error', e)
      // Revert on error
      setAvisos((prev) => prev.map((a) => a.id === id ? { ...a, generadoSAP: !newVal } : a))
    }
  }, [avisos])

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleDelete = useCallback(async (id: string) => {
    // Optimistic remove
    setAvisos((prev) => prev.filter((a) => a.id !== id))
    try {
      const res = await fetch('/api/notices', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) throw new Error(await res.text())
    } catch (e) {
      console.error('[Notices] delete error', e)
    }
  }, [])

  // ── Filter + search ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return avisos.filter((a) => {
      if (!showDone && a.generadoSAP) return false
      if (filterPrio !== 'all' && a.prioridad !== filterPrio) return false
      if (filterEsp !== 'all' && a.ejecutante !== filterEsp) return false
      if (q) {
        const match = [a.tag, a.descripcion, a.prioridad, EJECUTANTE_CONFIG[a.ejecutante].label]
          .some((f) => f?.toLowerCase().includes(q))
        if (!match) return false
      }
      return true
    })
  }, [avisos, search, filterPrio, filterEsp, showDone])

  // Sort: generadoSAP last → priority order → date desc
  const sorted = useMemo(() => {
    const order: Prioridad[] = ['MI', 'MN', 'PP', 'BKL']
    return [...filtered].sort((a, b) => {
      if (a.generadoSAP !== b.generadoSAP) return a.generadoSAP ? 1 : -1
      const pa = order.indexOf(a.prioridad)
      const pb = order.indexOf(b.prioridad)
      if (pa !== pb) return pa - pb
      return b.createdAt.localeCompare(a.createdAt)
    })
  }, [filtered])

  const hasFilters = filterPrio !== 'all' || filterEsp !== 'all' || search || !showDone

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full min-h-0">

      {/* ── LEFT: Form ── */}
      <div className="w-full lg:w-80 xl:w-96 shrink-0 overflow-y-auto pb-4 max-h-[90vh] lg:max-h-none">
        <AvisoForm onSave={handleSave} />
      </div>

      {/* ── RIGHT: List + KPIs ── */}
      <div className="flex-1 min-w-0 flex flex-col gap-4 min-h-0">

        {/* Toolbar */}
        <div className="flex flex-col gap-2 print:hidden">
          {/* Row 1: search + print */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
              <input
                className="w-full pl-8 pr-8 py-2 rounded-xl bg-slate-800/60 border border-slate-700/50
                           text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500/50"
                placeholder="Buscar por TAG, descripción, prioridad…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2">
                  <X className="w-3.5 h-3.5 text-slate-500 hover:text-slate-300" />
                </button>
              )}
            </div>
            <button
              onClick={() => window.print()}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700
                         text-[11px] text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Imprimir lista</span>
            </button>
          </div>

          {/* Row 2: chips scroll area */}
          <div className="overflow-x-auto">
            <div className="flex items-center gap-2 flex-nowrap">
              {/* Priority filter */}
              <div className="flex gap-1 flex-nowrap">
                <button
                  onClick={() => setFilterPrio('all')}
                  className={cn(
                    'px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-colors whitespace-nowrap',
                    filterPrio === 'all'
                      ? 'bg-slate-700 text-slate-200 border-slate-600'
                      : 'border-slate-700/50 text-slate-500 hover:text-slate-300',
                  )}
                >
                  Todas
                </button>
                {PRIORIDADES.map((p) => {
                  const cfg = PRIORIDAD_CONFIG[p]
                  return (
                    <button key={p} onClick={() => setFilterPrio(filterPrio === p ? 'all' : p)}
                      className={cn(
                        'px-2.5 py-1.5 rounded-lg border text-[11px] font-black font-mono transition-colors whitespace-nowrap',
                        filterPrio === p ? cn(cfg.bg, cfg.color, cfg.border) : 'border-slate-700/50 text-slate-500 hover:text-slate-300',
                      )}>
                      {p}
                    </button>
                  )
                })}
              </div>

              {/* Specialty filter */}
              <select
                className="kira-input text-[11px] py-1.5 w-auto shrink-0"
                value={filterEsp}
                onChange={(e) => setFilterEsp(e.target.value as Ejecutante | 'all')}
              >
                <option value="all">Todas las ejecutantees</option>
                {EJECUTANTES.map((e) => (
                  <option key={e} value={e}>{EJECUTANTE_CONFIG[e].icon} {EJECUTANTE_CONFIG[e].label}</option>
                ))}
              </select>

              {/* Show done toggle */}
              <button
                onClick={() => setShowDone(!showDone)}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] transition-colors whitespace-nowrap shrink-0',
                  !showDone
                    ? 'border-sky-500/40 bg-sky-500/10 text-sky-300'
                    : 'border-slate-700/50 text-slate-500 hover:text-slate-300',
                )}
              >
                <Filter className="w-3 h-3" />
                {showDone ? 'Ocultar generados' : 'Ver todos'}
              </button>

              {/* Clear filters */}
              {hasFilters && (
                <button
                  onClick={() => { setSearch(''); setFilterPrio('all'); setFilterEsp('all'); setShowDone(true) }}
                  className="text-[11px] text-sky-400 hover:text-sky-300 transition-colors whitespace-nowrap shrink-0"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Results count */}
        <p className="text-[10px] text-slate-500 print:hidden -mt-2">
          {sorted.length} aviso{sorted.length !== 1 ? 's' : ''}
          {hasFilters && ` · ${avisos.length} total`}
        </p>

        {/* Cards list */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 pb-4">
          {sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-600">
              <p className="text-sm">No hay avisos</p>
              <p className="text-xs mt-1">
                {avisos.length === 0 ? 'Registrá tu primer aviso en el formulario' : 'Probá ajustando los filtros'}
              </p>
            </div>
          ) : (
            sorted.map((aviso) => (
              <AvisoCard
                key={aviso.id}
                aviso={aviso}
                onToggleSAP={handleToggleSAP}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>

        {/* KPI footer */}
        <div className="shrink-0">
          <AvisoKpiBar avisos={avisos} />
        </div>
      </div>
    </div>
  )
}

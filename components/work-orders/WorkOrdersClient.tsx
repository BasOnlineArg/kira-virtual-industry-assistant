'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Plus, FileSpreadsheet, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import OtKpiBar from './OtKpiBar'
import OtTable from './OtTable'
import OtForm from './OtForm'
import OtXlsxImport from './OtXlsxImport'
import { STATUS_CONFIG, type WorkOrder, type OtStatus } from '@/lib/work-orders/types'

const STATUS_FILTERS: { value: OtStatus | 'all'; label: string }[] = [
  { value: 'all',          label: 'Todas'        },
  { value: 'en_proceso',   label: 'En proceso'   },
  { value: 'cumplida',     label: 'Cumplidas'    },
  { value: 'reprogramada', label: 'Reprogramadas'},
  { value: 'anulada',      label: 'Anuladas'     },
]

const GLOW_DURATION = 3000

interface Props {
  initialOrders: WorkOrder[]
}

export default function WorkOrdersClient({ initialOrders }: Props) {
  const [orders, setOrders]       = useState<WorkOrder[]>(initialOrders)
  const [search, setSearch]       = useState('')
  const [statusFilter, setStatus] = useState<OtStatus | 'all'>('all')
  const [showForm, setShowForm]   = useState(false)
  const [showXlsx, setShowXlsx]   = useState(false)
  const [recentIds, setRecentIds] = useState<Set<string>>(new Set())
  const [saving, setSaving]       = useState(false)

  // Glow effect
  function flashRecent(ids: string[]) {
    setRecentIds((prev) => new Set(Array.from(prev).concat(ids)))
    setTimeout(() => {
      setRecentIds((prev) => {
        const next = new Set(prev)
        ids.forEach((id) => next.delete(id))
        return next
      })
    }, GLOW_DURATION)
  }

  // ── Create single OT ───────────────────────────────────────────────────────
  const handleSave = useCallback(async (ot: WorkOrder) => {
    setSaving(true)
    try {
      const res = await fetch('/api/work-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ot),
      })
      if (!res.ok) throw new Error(await res.text())
      const [saved] = await res.json() as WorkOrder[]
      setOrders((prev) => [saved, ...prev])
      setShowForm(false)
      flashRecent([saved.id])
    } catch (e) {
      console.error('[WorkOrders] save error', e)
    } finally {
      setSaving(false)
    }
  }, [])

  // ── XLSX bulk import ───────────────────────────────────────────────────────
  const handleImport = useCallback(async (imported: WorkOrder[]) => {
    setSaving(true)
    try {
      const res = await fetch('/api/work-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(imported),
      })
      if (!res.ok) throw new Error(await res.text())
      const saved = await res.json() as WorkOrder[]
      setOrders((prev) => [...saved, ...prev])
      setShowXlsx(false)
      flashRecent(saved.map((o) => o.id))
    } catch (e) {
      console.error('[WorkOrders] import error', e)
    } finally {
      setSaving(false)
    }
  }, [])

  // ── Inline update ──────────────────────────────────────────────────────────
  const handleUpdate = useCallback(async (id: string, patch: Partial<WorkOrder>) => {
    // Optimistic update
    setOrders((prev) => prev.map((o) => o.id === id ? { ...o, ...patch } : o))
    flashRecent([id])
    try {
      const res = await fetch('/api/work-orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...patch }),
      })
      if (!res.ok) throw new Error(await res.text())
      const updated = await res.json() as WorkOrder
      setOrders((prev) => prev.map((o) => o.id === id ? updated : o))
    } catch (e) {
      console.error('[WorkOrders] update error', e)
    }
  }, [])

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = useCallback(async (id: string) => {
    // Optimistic remove
    setOrders((prev) => prev.filter((o) => o.id !== id))
    try {
      const res = await fetch('/api/work-orders', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) throw new Error(await res.text())
    } catch (e) {
      console.error('[WorkOrders] delete error', e)
    }
  }, [])

  // ── Filter + search ────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return orders.filter((o) => {
      const matchStatus = statusFilter === 'all' || o.status === statusFilter
      const matchSearch = !q || [o.otNumber, o.description, o.observations, isoWeekLabel(o.isoWeek, o.isoYear)]
        .some((f) => f?.toLowerCase().includes(q))
      return matchStatus && matchSearch
    })
  }, [orders, search, statusFilter])

  return (
    <div className="flex flex-col gap-5 h-full">

      {/* KPIs */}
      <OtKpiBar orders={filtered} />

      {/* Toolbar */}
      <div className="flex flex-col gap-2">
        {/* Row 1: search full width */}
        <div className="relative w-full">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
          <input
            className="w-full pl-8 pr-8 py-2 rounded-xl bg-slate-800/60 border border-slate-700/50
                       text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
            placeholder="Buscar por OT, descripción, semana, observaciones…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2">
              <X className="w-3.5 h-3.5 text-slate-500 hover:text-slate-300" />
            </button>
          )}
        </div>

        {/* Row 2: chips (scrollable) + action buttons */}
        <div className="flex items-center gap-2 min-w-0">
          {/* Status filter chips — horizontal scroll on mobile */}
          <div className="flex-1 overflow-x-auto min-w-0">
            <div className="flex gap-1 flex-nowrap">
              {STATUS_FILTERS.map((f) => {
                const active = statusFilter === f.value
                const cfg = f.value !== 'all' ? STATUS_CONFIG[f.value] : null
                return (
                  <button
                    key={f.value}
                    onClick={() => setStatus(f.value)}
                    className={cn(
                      'px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-colors whitespace-nowrap',
                      active
                        ? cfg ? cn(cfg.bg, cfg.color, cfg.border) : 'bg-slate-700 text-slate-200 border-slate-600'
                        : 'border-slate-700/50 text-slate-500 hover:text-slate-300 bg-slate-900/30',
                    )}
                  >
                    {f.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => setShowXlsx(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-700
                         text-xs text-slate-300 hover:text-white hover:border-emerald-500/50
                         hover:bg-emerald-500/10 transition-colors whitespace-nowrap"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Importar XLSX</span>
            </button>
            <button
              onClick={() => setShowForm(true)}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600
                         hover:bg-blue-500 text-white text-xs font-semibold transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Nueva OT</span>
            </button>
          </div>
        </div>
      </div>

      {/* Results count */}
      {(search || statusFilter !== 'all') && (
        <p className="text-[10px] text-slate-500 -mt-2">
          {filtered.length} OT{filtered.length !== 1 ? 's' : ''} · {orders.length} total
        </p>
      )}

      {/* Table */}
      <div className="flex-1 overflow-x-auto overflow-y-auto">
        <OtTable
          orders={filtered}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          recentIds={recentIds}
        />
      </div>

      {/* Modals */}
      {showForm && <OtForm onSave={handleSave} onClose={() => setShowForm(false)} />}
      {showXlsx && <OtXlsxImport onImport={handleImport} onClose={() => setShowXlsx(false)} />}
    </div>
  )
}

function isoWeekLabel(week: number, year: number) {
  return `S${String(week).padStart(2, '0')}-${year}`
}

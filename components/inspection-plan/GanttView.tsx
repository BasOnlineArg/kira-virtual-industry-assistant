'use client'

import { useState, useMemo } from 'react'
import { Search, X, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

interface WeekKey { week: number; year: number }

export interface GanttItem {
  id:              string
  asset_num:       number
  categoria:       string
  codigo:          string
  equipo:          string
  area:            string
  ruta:            string
  hh:              number
  scheduled_weeks: WeekKey[]
}

interface Props { items: GanttItem[] }

// ── Constants ─────────────────────────────────────────────────────────────────

// 56 weeks: S19/2026 → S52/2026 then S1/2027 → S22/2027
const ALL_WEEKS: WeekKey[] = [
  ...Array.from({ length: 34 }, (_, i) => ({ week: 19 + i, year: 2026 })),
  ...Array.from({ length: 22 }, (_, i) => ({ week: 1 + i,  year: 2027 })),
]

const COL_W = 18   // px per week column
const ROW_H = 26   // px per asset row
const LEFT_W = 252 // px for the fixed left column

// Returns Monday date string for an ISO week
function isoWeekStart(week: number, year: number): Date {
  const jan4 = new Date(year, 0, 4)
  const jan4Day = jan4.getDay() || 7
  const weekStart = new Date(jan4)
  weekStart.setDate(jan4.getDate() - (jan4Day - 1) + (week - 1) * 7)
  return weekStart
}

function fmtDate(d: Date) {
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
}

// Build month groups from the week sequence
interface MonthGroup { label: string; cols: number }
function buildMonthGroups(): MonthGroup[] {
  const groups: MonthGroup[] = []
  for (const wk of ALL_WEEKS) {
    const d     = isoWeekStart(wk.week, wk.year)
    const label = d.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' })
    const last  = groups[groups.length - 1]
    if (last && last.label === label) last.cols++
    else groups.push({ label, cols: 1 })
  }
  return groups
}
const MONTH_GROUPS = buildMonthGroups()

const CATEGORIA_COLOR: Record<string, string> = {
  'Edificios':                '#38bdf8',
  'Elevación':                '#fbbf24',
  'Tanques Gas Oil':          '#f97316',
  'Tanques Aceite':           '#eab308',
  'Tanques Agua':             '#3b82f6',
  'Redes de Incendio':        '#ef4444',
  'Estaciones de Compresión': '#a78bfa',
  'Plantas Móviles':          '#22c55e',
  'Recipientes a Presión':    '#f43f5e',
  'Portones':                 '#94a3b8',
  'Planta CAF':               '#8b5cf6',
  'Bombas Lodo UG':           '#10b981',
}
function catColor(cat: string) { return CATEGORIA_COLOR[cat] ?? '#64748b' }

function wkKey(w: WeekKey) { return `${w.year}-${w.week}` }

function isScheduled(item: GanttItem, wk: WeekKey) {
  return item.scheduled_weeks.some((w) => w.week === wk.week && w.year === wk.year)
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function GanttView({ items }: Props) {
  const [search,       setSearch]       = useState('')
  const [routeFilter,  setRouteFilter]  = useState<string>('all')
  const [selectedWeek, setSelectedWeek] = useState<WeekKey | null>(null)

  // Unique routes for filter
  const routes = useMemo(() => {
    const set = new Set(items.map((i) => i.ruta).filter(Boolean))
    return Array.from(set).sort()
  }, [items])

  // Filtered items
  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return items.filter((item) => {
      const matchRoute  = routeFilter === 'all' || item.ruta === routeFilter
      const matchSearch = !q || item.equipo.toLowerCase().includes(q) ||
        item.categoria.toLowerCase().includes(q) || item.area.toLowerCase().includes(q) ||
        (item.codigo && item.codigo.toLowerCase().includes(q))
      return matchRoute && matchSearch
    })
  }, [items, search, routeFilter])

  // Group by ruta preserving order
  const groups = useMemo(() => {
    const map = new Map<string, GanttItem[]>()
    for (const item of filtered) {
      const key = item.ruta || '—'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(item)
    }
    return Array.from(map.entries())
  }, [filtered])

  // Week popup data
  const weekPopupItems = useMemo(() => {
    if (!selectedWeek) return []
    const wItems = filtered.filter((i) => isScheduled(i, selectedWeek))
    // group by ruta
    const map = new Map<string, GanttItem[]>()
    for (const item of wItems) {
      const k = item.ruta || '—'
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(item)
    }
    return Array.from(map.entries())
  }, [selectedWeek, filtered])

  const weekPopupHH = useMemo(() => {
    if (!selectedWeek) return 0
    return filtered
      .filter((i) => isScheduled(i, selectedWeek))
      .reduce((acc, i) => acc + (i.hh ?? 0), 0)
  }, [selectedWeek, filtered])

  const totalWeekItems = weekPopupItems.reduce((a, [, v]) => a + v.length, 0)

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-600 gap-3">
        <Calendar className="w-10 h-10 opacity-30" />
        <p className="text-sm">Sin programa de inspecciones cargado.</p>
        <p className="text-xs">Importá el archivo desde Auxiliares → Prog. Inspecciones.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 h-full">

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap gap-2 items-center flex-shrink-0">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar activo, categoría, área..."
            className="pl-8 pr-8 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-xl
                       text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sky-500/50 w-56"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2">
              <X className="w-3.5 h-3.5 text-slate-500" />
            </button>
          )}
        </div>

        {/* Route filter */}
        <select
          value={routeFilter}
          onChange={(e) => setRouteFilter(e.target.value)}
          className="text-xs bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5
                     text-slate-300 focus:outline-none focus:border-sky-500/50"
        >
          <option value="all">Todas las rutas</option>
          {routes.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>

        <span className="text-[11px] text-slate-600 ml-auto">
          {filtered.length} de {items.length} activos
        </span>
      </div>

      {/* ── Legend ── */}
      <div className="flex flex-wrap gap-3 flex-shrink-0">
        {Object.entries(CATEGORIA_COLOR).map(([cat, color]) => (
          <div key={cat} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
            <span className="text-[10px] text-slate-500">{cat}</span>
          </div>
        ))}
      </div>

      {/* ── Gantt grid ── */}
      <div
        className="flex-1 overflow-auto rounded-xl border border-slate-700/50 bg-slate-900/40"
        style={{ minHeight: 0 }}
      >
        <div style={{ width: LEFT_W + ALL_WEEKS.length * COL_W, minWidth: '100%' }}>

          {/* ── Month header row ── */}
          <div className="flex sticky top-0 z-20 bg-slate-900 border-b border-slate-700/60">
            {/* Corner */}
            <div
              className="flex-shrink-0 sticky left-0 z-30 bg-slate-900 border-r border-slate-700/40
                         flex items-center px-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider"
              style={{ width: LEFT_W, height: 28 }}
            >
              Activo / Ruta
            </div>
            {/* Month labels */}
            {MONTH_GROUPS.map((mg, i) => (
              <div
                key={i}
                className="flex-shrink-0 flex items-center justify-center text-[10px] font-semibold
                           text-slate-400 uppercase tracking-wider border-r border-slate-700/30 last:border-r-0"
                style={{ width: mg.cols * COL_W, height: 28 }}
              >
                {mg.label}
              </div>
            ))}
          </div>

          {/* ── Week number header row ── */}
          <div className="flex sticky z-20 bg-slate-900 border-b border-slate-700/60" style={{ top: 28 }}>
            {/* Corner */}
            <div
              className="flex-shrink-0 sticky left-0 z-30 bg-slate-900 border-r border-slate-700/40"
              style={{ width: LEFT_W, height: 22 }}
            />
            {/* Week numbers — clickable */}
            {ALL_WEEKS.map((wk, i) => {
              const isSelected = selectedWeek && wk.week === selectedWeek.week && wk.year === selectedWeek.year
              const d = isoWeekStart(wk.week, wk.year)
              const hasItems = filtered.some((item) => isScheduled(item, wk))
              return (
                <div
                  key={i}
                  onClick={() => setSelectedWeek(isSelected ? null : wk)}
                  title={`S${wk.week}/${wk.year} — ${fmtDate(d)}`}
                  className={cn(
                    'flex-shrink-0 flex items-center justify-center text-[8px] font-mono cursor-pointer',
                    'border-r border-slate-800/50 last:border-r-0 transition-colors',
                    isSelected ? 'bg-sky-600/30 text-sky-300' :
                    hasItems   ? 'text-slate-500 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-800'
                  )}
                  style={{ width: COL_W, height: 22 }}
                >
                  {wk.week}
                </div>
              )
            })}
          </div>

          {/* ── Asset rows grouped by route ── */}
          {groups.map(([ruta, groupItems]) => (
            <div key={ruta}>
              {/* Route separator */}
              <div
                className="flex sticky z-10 bg-slate-900/80 border-y border-slate-700/30"
                style={{ top: 50 }}
              >
                <div
                  className="flex-shrink-0 sticky left-0 z-20 bg-slate-800/80 border-r border-slate-700/40
                             flex items-center px-3 gap-2"
                  style={{ width: LEFT_W, height: 24 }}
                >
                  <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider truncate">
                    ▶ {ruta}
                  </span>
                  <span className="text-[10px] text-slate-600 flex-shrink-0">
                    {groupItems.length} activos
                  </span>
                </div>
                <div
                  className="flex-1 bg-slate-800/30"
                  style={{ height: 24 }}
                />
              </div>

              {/* Asset rows */}
              {groupItems.map((item, idx) => (
                <div
                  key={item.id}
                  className={cn('flex border-b border-slate-800/40 last:border-b-0',
                    idx % 2 === 0 ? 'bg-transparent' : 'bg-slate-900/30')}
                  style={{ height: ROW_H }}
                >
                  {/* Left: asset info — sticky */}
                  <div
                    className={cn(
                      'flex-shrink-0 sticky left-0 z-10 flex items-center gap-2 px-3 border-r border-slate-800/40',
                      idx % 2 === 0 ? 'bg-slate-950' : 'bg-slate-900/80'
                    )}
                    style={{ width: LEFT_W }}
                  >
                    <div
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ background: catColor(item.categoria) }}
                    />
                    <div className="min-w-0">
                      <p className="text-[11px] text-slate-300 truncate leading-none">
                        {item.equipo}
                      </p>
                      <p className="text-[9px] text-slate-600 truncate mt-0.5">
                        {item.categoria}{item.codigo ? ` · ${item.codigo}` : ''}
                      </p>
                    </div>
                    <span className="text-[9px] text-slate-700 ml-auto flex-shrink-0">
                      {item.hh}h
                    </span>
                  </div>

                  {/* Week cells */}
                  {ALL_WEEKS.map((wk, wi) => {
                    const scheduled  = isScheduled(item, wk)
                    const isSelected = selectedWeek &&
                      wk.week === selectedWeek.week && wk.year === selectedWeek.year
                    return (
                      <div
                        key={wi}
                        className={cn(
                          'flex-shrink-0 flex items-center justify-center border-r border-slate-800/20 last:border-r-0',
                          isSelected ? 'bg-sky-600/10' : ''
                        )}
                        style={{ width: COL_W, height: ROW_H }}
                      >
                        {scheduled && (
                          <div
                            className="rounded-full"
                            style={{
                              width: 7, height: 7,
                              background: catColor(item.categoria),
                              boxShadow: `0 0 4px ${catColor(item.categoria)}80`,
                            }}
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── Week detail popup ── */}
      {selectedWeek && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setSelectedWeek(null)}>
          <div
            className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[80vh]
                       flex flex-col shadow-2xl shadow-black/60"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between p-5 border-b border-slate-700/50">
              <div>
                <p className="text-sm font-bold text-slate-100">
                  Semana {selectedWeek.week} — {selectedWeek.year}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {fmtDate(isoWeekStart(selectedWeek.week, selectedWeek.year))} al{' '}
                  {fmtDate(new Date(isoWeekStart(selectedWeek.week, selectedWeek.year).getTime() + 6 * 86400000))}
                </p>
              </div>
              <div className="text-right mr-2">
                <p className="text-lg font-bold text-sky-400">{totalWeekItems}</p>
                <p className="text-[10px] text-slate-600">activos</p>
                <p className="text-xs font-semibold text-emerald-400">{weekPopupHH.toFixed(1)} hs</p>
              </div>
              <button onClick={() => setSelectedWeek(null)}
                className="text-slate-500 hover:text-slate-300 transition-colors ml-2">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {weekPopupItems.length === 0 ? (
                <p className="text-sm text-slate-600 text-center py-8">
                  Sin tareas programadas esta semana.
                </p>
              ) : weekPopupItems.map(([ruta, ritems]) => (
                <div key={ruta}>
                  <p className="text-[10px] font-bold text-sky-400 uppercase tracking-wider mb-2">
                    {ruta} · {ritems.length} activos · {ritems.reduce((a, i) => a + (i.hh ?? 0), 0).toFixed(1)} hs
                  </p>
                  <div className="space-y-1">
                    {ritems.map((item) => (
                      <div key={item.id}
                        className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 rounded-lg">
                        <div className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ background: catColor(item.categoria) }} />
                        <span className="text-xs text-slate-300 flex-1 truncate">{item.equipo}</span>
                        <span className="text-[10px] text-slate-600 flex-shrink-0">{item.categoria}</span>
                        <span className="text-[10px] text-slate-500 flex-shrink-0 font-mono">{item.hh}h</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

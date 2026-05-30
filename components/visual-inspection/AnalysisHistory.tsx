'use client'

import { useState, useMemo } from 'react'
import { Search, AlertTriangle, AlertCircle, CheckCircle, Clock, Calendar, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AnalysisResult } from './DiagnosisResult'

const PAGE_SIZE = 20

interface HistoryItem {
  id: string
  asset_tag: string | null
  severidad: string | null
  diagnostico: string | null
  foto_url: string | null
  fecha: string
  inspector_name?: string
}

const severityIcon = {
  ALTA: { icon: AlertTriangle, color: 'text-red-400' },
  MEDIA: { icon: AlertCircle, color: 'text-amber-400' },
  BAJA: { icon: CheckCircle, color: 'text-emerald-400' },
}

function relativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (hours < 1) return 'hace menos de 1h'
  if (hours < 24) return `hace ${hours}h`
  if (days === 1) return 'ayer'
  if (days < 7) return `hace ${days}d`
  return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: '2-digit' })
}

interface AnalysisHistoryProps {
  items: HistoryItem[]
  onSelect: (item: AnalysisResult) => void
  activeId?: string | null
}

export default function AnalysisHistory({ items, onSelect, activeId }: AnalysisHistoryProps) {
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showDateFilter, setShowDateFilter] = useState(false)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const filtered = useMemo(() => {
    return items.filter((item) => {
      // TAG search
      const matchTag = !search.trim() ||
        (item.asset_tag ?? '').toLowerCase().includes(search.toLowerCase())

      // Date range
      const itemDate = new Date(item.fecha)
      const matchFrom = !dateFrom || itemDate >= new Date(dateFrom)
      const matchTo = !dateTo || itemDate <= new Date(dateTo + 'T23:59:59')

      return matchTag && matchFrom && matchTo
    })
  }, [items, search, dateFrom, dateTo])

  const visible = filtered.slice(0, visibleCount)
  const hasMore = filtered.length > visibleCount

  function resetFilters() {
    setSearch('')
    setDateFrom('')
    setDateTo('')
    setVisibleCount(PAGE_SIZE)
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Clock className="w-10 h-10 text-slate-700 mb-3" />
        <p className="text-slate-500 text-sm">No hay análisis en el historial.</p>
        <p className="text-slate-600 text-xs mt-1">
          El primer análisis que realices aparecerá aquí.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          placeholder="Buscar por TAG..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setVisibleCount(PAGE_SIZE) }}
          className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg
                     text-sm text-slate-200 placeholder-slate-600 focus:outline-none
                     focus:ring-2 focus:ring-sky-500/50 focus:border-transparent"
        />
      </div>

      {/* Date filter toggle */}
      <button
        onClick={() => setShowDateFilter((v) => !v)}
        className={cn(
          'flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border transition-colors w-full',
          showDateFilter
            ? 'border-sky-500/40 bg-sky-500/10 text-sky-400'
            : 'border-slate-700/50 bg-slate-900/30 text-slate-500 hover:text-slate-300'
        )}
      >
        <Calendar className="w-3.5 h-3.5" />
        <span>Filtrar por fecha</span>
        <ChevronDown className={cn('w-3.5 h-3.5 ml-auto transition-transform', showDateFilter && 'rotate-180')} />
      </button>

      {showDateFilter && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-wider">Desde</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setVisibleCount(PAGE_SIZE) }}
              className="w-full mt-1 px-2 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg
                         text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-wider">Hasta</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setVisibleCount(PAGE_SIZE) }}
              className="w-full mt-1 px-2 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg
                         text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>
        </div>
      )}

      {/* Results count + reset */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-slate-600">
          {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
          {filtered.length !== items.length && ` de ${items.length}`}
        </p>
        {(search || dateFrom || dateTo) && (
          <button onClick={resetFilters} className="text-[10px] text-sky-500 hover:text-sky-400">
            Limpiar filtros
          </button>
        )}
      </div>

      {/* List */}
      <div className="space-y-2">
        {visible.length === 0 ? (
          <p className="text-center text-slate-600 text-sm py-8">
            Sin resultados para los filtros aplicados
          </p>
        ) : (
          <>
            {visible.map((item) => {
              const sev = item.severidad as keyof typeof severityIcon
              const SevConfig = severityIcon[sev] ?? severityIcon.MEDIA
              const SevIcon = SevConfig.icon

              return (
                <button
                  key={item.id}
                  onClick={() =>
                    onSelect({
                      id: item.id,
                      tag: item.asset_tag ?? '—',
                      diagnostico: item.diagnostico ?? '',
                      severidad: item.severidad ?? 'MEDIA',
                      base_metodologica: '',
                      recomendaciones: '',
                      foto_url: item.foto_url,
                      fecha: item.fecha,
                      inspector_name: item.inspector_name ?? '—',
                    })
                  }
                  className={cn(
                    'w-full text-left flex items-start gap-3 p-3 rounded-xl border transition-colors',
                    activeId === item.id
                      ? 'border-sky-500/30 bg-sky-500/5'
                      : 'border-slate-700/40 bg-slate-900/40 hover:border-slate-600 hover:bg-slate-800/50'
                  )}
                >
                  {/* Thumbnail */}
                  <div className="w-14 h-14 rounded-lg overflow-hidden bg-slate-800 flex-shrink-0">
                    {item.foto_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.foto_url}
                        alt={item.asset_tag ?? ''}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <AlertCircle className="w-5 h-5 text-slate-600" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-slate-200 truncate">
                        {item.asset_tag ?? 'Sin TAG'}
                      </span>
                      <SevIcon className={cn('w-3.5 h-3.5 flex-shrink-0', SevConfig.color)} />
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {item.diagnostico ?? '—'}
                    </p>
                    <p className="text-[10px] text-slate-600 mt-1">{relativeTime(item.fecha)}</p>
                  </div>
                </button>
              )
            })}

            {/* Ver más */}
            {hasMore && (
              <button
                onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
                className="w-full py-2.5 text-xs text-slate-400 hover:text-slate-200 border border-slate-700/40 hover:border-slate-600 rounded-xl transition-colors"
              >
                Ver más ({filtered.length - visibleCount} restantes)
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

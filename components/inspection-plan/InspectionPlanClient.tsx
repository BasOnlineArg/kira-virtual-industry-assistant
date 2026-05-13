'use client'

import { useState } from 'react'
import { CalendarRange, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import GanttView, { type GanttItem } from './GanttView'
import RoutesView, { type InspectionRoute } from './RoutesView'

type Tab = 'gantt' | 'routes'

interface Program {
  id:          string
  filename:    string
  uploaded_at: string
  total_assets: number
}

interface Props {
  program:  Program | null
  items:    GanttItem[]
  routes:   InspectionRoute[]
}

export default function InspectionPlanClient({ program, items, routes }: Props) {
  const [tab, setTab] = useState<Tab>('gantt')

  return (
    <div className="flex flex-col h-full min-h-0 p-4 md:p-6 gap-4">

      {/* ── Header ── */}
      <div className="flex-shrink-0 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold text-slate-100">Programa de Inspecciones y Rutas</h1>
          {program ? (
            <p className="text-xs text-slate-500 mt-0.5">
              {program.filename} · {program.total_assets} activos ·{' '}
              cargado el {new Date(program.uploaded_at).toLocaleDateString('es-AR', {
                day: '2-digit', month: 'short', year: 'numeric',
              })}
            </p>
          ) : (
            <p className="text-xs text-slate-600 mt-0.5">Sin programa activo</p>
          )}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex-shrink-0 flex border-b border-slate-700/50 overflow-x-auto">
        {([
          { key: 'gantt',  label: 'Programa Gantt',        icon: CalendarRange },
          { key: 'routes', label: 'Rutas de Inspección',   icon: MapPin        },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'flex items-center gap-2 px-5 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap',
              tab === key
                ? 'border-sky-500 text-sky-300'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
            {key === 'gantt'  && items.length  > 0 && (
              <span className="text-[10px] bg-slate-800 text-slate-400 rounded-full px-1.5 py-0.5">
                {items.length}
              </span>
            )}
            {key === 'routes' && routes.length > 0 && (
              <span className="text-[10px] bg-slate-800 text-slate-400 rounded-full px-1.5 py-0.5">
                {routes.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div className="flex-1 min-h-0 overflow-auto">
        {tab === 'gantt'  && <GanttView  items={items}   />}
        {tab === 'routes' && <RoutesView routes={routes} />}
      </div>

    </div>
  )
}

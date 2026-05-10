'use client'

import { useMemo } from 'react'
import { Clock, CheckCircle, RefreshCw, Activity } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WorkOrder } from '@/lib/work-orders/types'

interface OtKpiBarProps {
  orders: WorkOrder[]
}

export default function OtKpiBar({ orders }: OtKpiBarProps) {
  const kpis = useMemo(() => {
    const hhProg    = orders.reduce((s, o) => s + o.hhProg, 0)
    const hhr       = orders.reduce((s, o) => s + o.hhr, 0)
    const enProceso = orders.filter((o) => o.status === 'en_proceso').length
    const cumplidas = orders.filter((o) => o.status === 'cumplida').length
    const reprog    = orders.filter((o) => o.status === 'reprogramada').length
    const efic      = hhProg > 0 ? Math.round((hhr / hhProg) * 100) : null
    return { hhProg, hhr, enProceso, cumplidas, reprog, efic, total: orders.length }
  }, [orders])

  const cards = [
    {
      label: 'HH Programadas',
      value: kpis.hhProg.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
      sub: `${kpis.total} OT${kpis.total !== 1 ? 's' : ''}`,
      icon: Clock,
      color: 'text-slate-300',
      bg: 'bg-slate-800/60',
    },
    {
      label: 'HHR Registradas',
      value: kpis.hhr.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
      sub: kpis.efic != null ? `${kpis.efic}% eficiencia` : 'Sin datos',
      icon: Activity,
      color: kpis.efic == null ? 'text-slate-400' : kpis.efic <= 110 ? 'text-emerald-400' : 'text-amber-400',
      bg: 'bg-slate-800/60',
    },
    {
      label: 'En Proceso',
      value: kpis.enProceso,
      sub: 'frentes abiertos',
      icon: RefreshCw,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
    },
    {
      label: 'Cumplidas',
      value: kpis.cumplidas,
      sub: kpis.total > 0 ? `${Math.round((kpis.cumplidas / kpis.total) * 100)}% del total` : '—',
      icon: CheckCircle,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
    {
      label: 'Reprogramadas',
      value: kpis.reprog,
      sub: kpis.reprog > 0 ? '⚠️ revisar planificación' : 'Sin atrasos',
      icon: Clock,
      color: kpis.reprog > 0 ? 'text-amber-400' : 'text-slate-500',
      bg: kpis.reprog > 0 ? 'bg-amber-500/10' : 'bg-slate-800/60',
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
      {cards.map((c) => (
        <div key={c.label} className={cn('rounded-2xl border border-slate-700/40 p-4', c.bg)}>
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">{c.label}</p>
            <c.icon className={cn('w-3.5 h-3.5', c.color)} />
          </div>
          <p className={cn('text-2xl font-mono font-bold', c.color)}>{c.value}</p>
          <p className="text-[10px] text-slate-600 mt-0.5">{c.sub}</p>
        </div>
      ))}
    </div>
  )
}

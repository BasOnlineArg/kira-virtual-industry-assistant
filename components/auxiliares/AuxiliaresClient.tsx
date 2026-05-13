'use client'

import { useState } from 'react'
import {
  Package, CalendarRange, Route, Tag, Users,
  Cpu, Flag, ClipboardCheck, Wrench,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import SimpleListTab        from './SimpleListTab'
import EquiposTab           from './EquiposTab'
import RepuestosTab         from './RepuestosTab'
import InspectionImportTab  from './InspectionImportTab'
import ActivosTab           from './ActivosTab'

type Tab =
  | 'activos' | 'prog_inspeccion' | 'rutas' | 'categorias'
  | 'equipos' | 'tipos_activo' | 'prioridades'
  | 'inspecciones' | 'repuestos'

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'activos',         label: 'Activos',            icon: Package       },
  { id: 'prog_inspeccion', label: 'Prog. Inspecciones', icon: CalendarRange },
  { id: 'rutas',           label: 'Rutas',              icon: Route         },
  { id: 'categorias',      label: 'Categorías',         icon: Tag           },
  { id: 'equipos',         label: 'Equipos de trabajo', icon: Users         },
  { id: 'tipos_activo',    label: 'Tipos de activo',    icon: Cpu           },
  { id: 'prioridades',     label: 'Prioridades',        icon: Flag          },
  { id: 'inspecciones',    label: 'Inspecciones',       icon: ClipboardCheck },
  { id: 'repuestos',       label: 'Repuestos SAP',      icon: Wrench        },
]

// Listas fijas — solo lectura
const PRIORIDADES_FIJAS = [
  { id: '1', nombre: 'MI — Inmediata (Urgente)' },
  { id: '2', nombre: 'MN — Próximo programa' },
  { id: '3', nombre: 'PO — Planificada' },
  { id: '4', nombre: 'PP — Parada de planta' },
  { id: '5', nombre: 'BKL — Backlog' },
]
const INSPECCIONES_FIJAS = [
  { id: '1', nombre: 'Rutina' },
  { id: '2', nombre: 'Preventiva' },
  { id: '3', nombre: 'Correctiva' },
  { id: '4', nombre: 'Predictiva' },
  { id: '5', nombre: 'Emergencia' },
  { id: '6', nombre: 'Inspección END' },
]

interface Props {
  categorias:     any[]
  tiposActivo:    any[]
  rutas:          any[]
  equipos:        any[]
  repuestos:      any[]
  assets:         any[]
  isSuperusuario: boolean
}

export default function AuxiliaresClient({
  categorias, tiposActivo, rutas, equipos, repuestos, assets, isSuperusuario,
}: Props) {
  const [tab, setTab] = useState<Tab>('activos')

  return (
    <div className="flex flex-col gap-6">

      {/* Tab bar — scrollable en mobile */}
      <div className="overflow-x-auto">
        <div className="flex gap-1 bg-slate-800/60 border border-slate-700/50 rounded-2xl p-1 w-max min-w-full">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all shrink-0',
                tab === t.id
                  ? 'bg-sky-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50',
              )}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div>
        {tab === 'activos' && (
          <ActivosTab initialAssets={assets} isSuperusuario={isSuperusuario} />
        )}
        {tab === 'prog_inspeccion' && (
          <InspectionImportTab isSuperusuario={isSuperusuario} />
        )}
        {tab === 'rutas' && (
          <SimpleListTab tabla="rutas_inspeccion" initialItems={rutas} />
        )}
        {tab === 'categorias' && (
          <SimpleListTab tabla="categorias" initialItems={categorias} />
        )}
        {tab === 'equipos' && (
          <EquiposTab initialItems={equipos} />
        )}
        {tab === 'tipos_activo' && (
          <SimpleListTab tabla="tipos_activo" initialItems={tiposActivo} />
        )}
        {tab === 'prioridades' && (
          <SimpleListTab tabla="" initialItems={PRIORIDADES_FIJAS} readOnly />
        )}
        {tab === 'inspecciones' && (
          <SimpleListTab tabla="" initialItems={INSPECCIONES_FIJAS} readOnly />
        )}
        {tab === 'repuestos' && (
          <RepuestosTab initialItems={repuestos} />
        )}
      </div>

    </div>
  )
}

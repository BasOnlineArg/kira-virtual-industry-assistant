'use client'

import { MapPin, Clock, Package, Repeat } from 'lucide-react'

export interface InspectionRoute {
  id:            string
  ruta_zona:     string
  frec_visual:   string
  jornada_campo: string
  activos_count: number
  hh_semana:     string
  composicion:   string
  sort_order:    number
}

interface Props { routes: InspectionRoute[] }

const ROUTE_COLORS: Record<string, string> = {
  'Ruta Truckshop':      '#38bdf8',
  'Ruta Marianas':       '#a78bfa',
  'Ruta Eureka':         '#fbbf24',
  'Ruta Vein Zone':      '#34d399',
  'Ruta San Marcos':     '#f87171',
  'Ruta Planta Proceso': '#fb923c',
  'A definir':           '#64748b',
}
function routeColor(name: string) {
  return ROUTE_COLORS[name] ?? '#64748b'
}

// Parse "Portones (32) · Elevación (8) · ..." into segments
function parseComposicion(comp: string) {
  if (!comp) return []
  return comp.split(/[·•|,]/).map((s) => s.trim()).filter(Boolean)
}

export default function RoutesView({ routes }: Props) {
  if (routes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-600 gap-3">
        <MapPin className="w-10 h-10 opacity-30" />
        <p className="text-sm">Sin rutas de inspección cargadas.</p>
        <p className="text-xs">Importá el archivo desde Auxiliares → Prog. Inspecciones.</p>
      </div>
    )
  }

  const totalActivos = routes.reduce((a, r) => a + (r.activos_count ?? 0), 0)

  return (
    <div className="flex flex-col gap-4">

      {/* Summary bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Rutas totales',   value: routes.length,    sub: 'configuradas' },
          { label: 'Activos cubiertos', value: totalActivos,   sub: 'total del programa' },
          { label: 'Inspector único', value: '1',              sub: '365 días/año' },
          { label: 'Régimen',         value: '14×14',          sub: 'días en sitio / descanso' },
        ].map((kpi) => (
          <div key={kpi.label}
            className="bg-slate-800/40 border border-slate-700/40 rounded-xl px-4 py-3">
            <p className="text-2xl font-bold text-slate-100">{kpi.value}</p>
            <p className="text-xs font-medium text-slate-300 mt-0.5">{kpi.label}</p>
            <p className="text-[10px] text-slate-600 mt-0.5">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Route cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {routes.map((route) => {
          const color  = routeColor(route.ruta_zona)
          const comps  = parseComposicion(route.composicion)
          const isPending = route.ruta_zona.toLowerCase().includes('definir')

          return (
            <div
              key={route.id}
              className="bg-slate-800/30 border border-slate-700/40 rounded-2xl p-5 flex flex-col gap-4
                         hover:border-slate-600/60 transition-colors"
              style={{ borderLeftColor: color, borderLeftWidth: 3 }}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-100">{route.ruta_zona}</h3>
                  {isPending && (
                    <span className="inline-block mt-1 text-[10px] text-amber-400 bg-amber-400/10
                                     border border-amber-400/20 rounded-full px-2 py-0.5">
                      GPS pendiente
                    </span>
                  )}
                </div>
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: color + '20' }}
                >
                  <MapPin className="w-4 h-4" style={{ color }} />
                </div>
              </div>

              {/* KPIs */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-900/50 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Package className="w-3 h-3 text-slate-500" />
                    <span className="text-[10px] text-slate-500">Activos</span>
                  </div>
                  <p className="text-lg font-bold text-slate-100">{route.activos_count}</p>
                </div>
                <div className="bg-slate-900/50 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span className="text-[10px] text-slate-500">HH/semana</span>
                  </div>
                  <p className="text-sm font-bold text-slate-100">{route.hh_semana || '—'}</p>
                </div>
                <div className="bg-slate-900/50 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Repeat className="w-3 h-3 text-slate-500" />
                    <span className="text-[10px] text-slate-500">Frecuencia</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-200 leading-snug">
                    {route.frec_visual || '—'}
                  </p>
                </div>
                <div className="bg-slate-900/50 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span className="text-[10px] text-slate-500">Jornada campo</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-200">{route.jornada_campo || '—'}</p>
                </div>
              </div>

              {/* Asset type composition */}
              {comps.length > 0 && (
                <div>
                  <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-2">
                    Composición
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {comps.map((comp, i) => (
                      <span
                        key={i}
                        className="text-[10px] text-slate-400 bg-slate-800 border border-slate-700/50
                                   rounded-full px-2 py-0.5"
                      >
                        {comp}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

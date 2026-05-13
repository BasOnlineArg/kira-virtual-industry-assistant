'use client'

import { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { Layers, Plus, X, ChevronDown, ChevronUp, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'
import AssetList from './AssetList'
import AssetDetailPanel from './AssetDetailPanel'
import MineSelector from './MineSelector'
import UndergroundMap from './UndergroundMap'
import AssetFormModal from './AssetFormModal'
import type { Asset, Capa, MineId } from '@/lib/geo/types'

// ── Mock assets (buffer only — desaparecen al recargar) ──────────────────────
const MOCK_ASSETS: Asset[] = [
  // ── Superficie ──────────────────────────────────────────────────────────────
  {
    id: 'mock-001', tag: '3113-10-00-11', nombre: 'Taller Truckshop',
    tipo: 'Edificios', capa: 'superficie', sector: 'Truckshop',
    lat: -46.8628, lng: -70.3275, status: 'Operativo',
    inspector_asignado: 'M. Rodríguez', ultima_inspeccion: '2026-04-15',
    historial: [
      { fecha: '2026-04-15', texto: 'Inspección rutinaria OK', estado: 'ok' },
      { fecha: '2026-03-01', texto: 'Revisión eléctrica completada', estado: 'ok' },
    ],
  },
  {
    id: 'mock-002', tag: '3113-10-00-50', nombre: 'Lubricantera',
    tipo: 'Edificios', capa: 'superficie', sector: 'Truckshop',
    lat: -46.8633, lng: -70.3261, status: 'Operativo',
    inspector_asignado: 'M. Rodríguez', ultima_inspeccion: '2026-04-15',
    historial: [
      { fecha: '2026-04-15', texto: 'Sin novedades', estado: 'ok' },
    ],
  },
  {
    id: 'mock-003', tag: '3113-10-70-50', nombre: 'Planta CAF',
    tipo: 'Edificios', capa: 'superficie', sector: 'Planta CAF',
    lat: -46.8642, lng: -70.3255, status: 'En mantenimiento',
    inspector_asignado: 'J. Pérez', ultima_inspeccion: '2026-04-10',
    historial: [
      { fecha: '2026-04-10', texto: 'Revisión de estructura — pendiente soldadura', estado: 'warn' },
    ],
  },
  {
    id: 'mock-004', tag: '3113-10-60', nombre: 'Tratamiento de Aguas',
    tipo: 'Edificios', capa: 'superficie', sector: 'San Marcos',
    lat: -46.8620, lng: -70.3280, status: 'Operativo',
    inspector_asignado: 'M. Rodríguez', ultima_inspeccion: '2026-04-20',
    historial: [
      { fecha: '2026-04-20', texto: 'Operación normal', estado: 'ok' },
    ],
  },
  {
    id: 'mock-005', tag: '3113-30-20-10-CRB0001', nombre: 'Puente Grúa 20T',
    tipo: 'Elevación', capa: 'superficie', sector: 'Planta Proceso',
    lat: -46.8650, lng: -70.3270, status: 'Operativo',
    inspector_asignado: 'J. Pérez', ultima_inspeccion: '2026-04-22',
    historial: [
      { fecha: '2026-04-22', texto: 'Frenos y limitadores OK', estado: 'ok' },
      { fecha: '2026-03-10', texto: 'Lubricación completa', estado: 'ok' },
    ],
  },
  {
    id: 'mock-006', tag: '3113-20-BLG0004-HEL001', nombre: 'Elevador 4,5T — Livianos',
    tipo: 'Elevación', capa: 'superficie', sector: 'Eureka',
    lat: -46.8639, lng: -70.3247, status: 'Operativo',
    inspector_asignado: 'M. Rodríguez', ultima_inspeccion: '2026-04-18',
    historial: [
      { fecha: '2026-04-18', texto: 'Inspección reglamentaria — OK', estado: 'ok' },
    ],
  },
  {
    id: 'mock-007', tag: '3113-50-VEN001', nombre: 'Ventilador Principal VF-01',
    tipo: 'Ventilación', capa: 'superficie', sector: 'Acceso Mina',
    lat: -46.8655, lng: -70.3258, status: 'Operativo',
    inspector_asignado: 'J. Pérez', ultima_inspeccion: '2026-04-25',
    historial: [
      { fecha: '2026-04-25', texto: 'Caudal nominal 42 m³/s — OK', estado: 'ok' },
    ],
  },
  {
    id: 'mock-008', tag: '3113-50-VEN002', nombre: 'Ventilador Auxiliar VF-02',
    tipo: 'Ventilación', capa: 'superficie', sector: 'Acceso Mina',
    lat: -46.8658, lng: -70.3265, status: 'Fuera de servicio',
    inspector_asignado: 'J. Pérez', ultima_inspeccion: '2026-04-25',
    historial: [
      { fecha: '2026-04-25', texto: 'Falla en rodamiento — en reparación', estado: 'warn' },
      { fecha: '2026-04-20', texto: 'Vibración elevada detectada', estado: 'warn' },
    ],
  },
  {
    id: 'mock-009', tag: '3113-40-BOM001', nombre: 'Bomba de Achique BM-01',
    tipo: 'Bombas', capa: 'superficie', sector: 'Truckshop',
    lat: -46.8625, lng: -70.3268, status: 'Operativo',
    inspector_asignado: 'M. Rodríguez', ultima_inspeccion: '2026-04-12',
    historial: [
      { fecha: '2026-04-12', texto: 'Caudal y presión dentro de parámetros', estado: 'ok' },
    ],
  },
  {
    id: 'mock-010', tag: 'CAT-785C-001', nombre: 'Camión CAT 785C #001',
    tipo: 'Transporte', capa: 'superficie', sector: 'Truckshop',
    lat: -46.8631, lng: -70.3272, status: 'En mantenimiento',
    inspector_asignado: 'J. Pérez', ultima_inspeccion: '2026-04-23',
    historial: [
      { fecha: '2026-04-23', texto: 'PM-4 en curso — estimado 3 días', estado: 'warn' },
    ],
  },

  // ── Subterráneo — Mariana Central ────────────────────────────────────────────
  {
    id: 'mock-011', tag: '3113-MC-ELV001', nombre: 'Elevador Jaula MC-550',
    tipo: 'Elevación', capa: 'subterraneo', sector: 'Nivel 550', mina: 'mariana_central',
    ug_x: 571, ug_y: 550, status: 'Operativo',
    inspector_asignado: 'M. Rodríguez', ultima_inspeccion: '2026-04-20',
    historial: [
      { fecha: '2026-04-20', texto: 'Cable guía inspeccionado OK', estado: 'ok' },
    ],
  },
  {
    id: 'mock-012', tag: '3113-MC-BOM010', nombre: 'Bomba Sumidero Nv.400',
    tipo: 'Bombas', capa: 'subterraneo', sector: 'Nivel 400', mina: 'mariana_central',
    ug_x: 563, ug_y: 400, status: 'Operativo',
    inspector_asignado: 'J. Pérez', ultima_inspeccion: '2026-04-19',
    historial: [
      { fecha: '2026-04-19', texto: 'Sin novedades', estado: 'ok' },
    ],
  },
  {
    id: 'mock-013', tag: '3113-MC-VEN010', nombre: 'Ventilador Secundario Nv.480',
    tipo: 'Ventilación', capa: 'subterraneo', sector: 'Nivel 480', mina: 'mariana_central',
    ug_x: 578, ug_y: 480, status: 'Operativo',
    inspector_asignado: 'M. Rodríguez', ultima_inspeccion: '2026-04-17',
    historial: [
      { fecha: '2026-04-17', texto: 'Flujo OK', estado: 'ok' },
    ],
  },
  {
    id: 'mock-014', tag: '3113-MC-STK001', nombre: 'Stacker Rail Nv.520',
    tipo: 'Elevación', capa: 'subterraneo', sector: 'Nivel 520', mina: 'mariana_central',
    ug_x: 584, ug_y: 520, status: 'En mantenimiento',
    inspector_asignado: 'J. Pérez', ultima_inspeccion: '2026-04-21',
    historial: [
      { fecha: '2026-04-21', texto: 'Cambio de ruedas — 2 días', estado: 'warn' },
    ],
  },

  // ── Subterráneo — Mariana Norte ──────────────────────────────────────────────
  {
    id: 'mock-015', tag: '3113-MN-ELV001', nombre: 'Skip de Extracción MN',
    tipo: 'Elevación', capa: 'subterraneo', sector: 'Nivel 380', mina: 'mariana_norte',
    ug_x: 22, ug_y: 380, status: 'Operativo',
    inspector_asignado: 'M. Rodríguez', ultima_inspeccion: '2026-04-22',
    historial: [
      { fecha: '2026-04-22', texto: 'Sistema de frenado OK', estado: 'ok' },
    ],
  },
  {
    id: 'mock-016', tag: '3113-MN-BOM001', nombre: 'Bomba Principal MN Nv.320',
    tipo: 'Bombas', capa: 'subterraneo', sector: 'Nivel 320', mina: 'mariana_norte',
    ug_x: 15, ug_y: 320, status: 'Operativo',
    inspector_asignado: 'J. Pérez', ultima_inspeccion: '2026-04-18',
    historial: [
      { fecha: '2026-04-18', texto: 'Presión 8 bar — OK', estado: 'ok' },
    ],
  },

  // ── Subterráneo — San Marcos ─────────────────────────────────────────────────
  {
    id: 'mock-017', tag: '3113-SM-ELV001', nombre: 'Jaula de Personal SM',
    tipo: 'Elevación', capa: 'subterraneo', sector: 'Nivel 430', mina: 'san_marcos',
    ug_x: 26, ug_y: 430, status: 'Operativo',
    inspector_asignado: 'M. Rodríguez', ultima_inspeccion: '2026-04-24',
    historial: [
      { fecha: '2026-04-24', texto: 'Capacidad y limitadores OK', estado: 'ok' },
    ],
  },
  {
    id: 'mock-018', tag: '3113-SM-VEN001', nombre: 'Ventilador Principal SM',
    tipo: 'Ventilación', capa: 'subterraneo', sector: 'Nivel 400', mina: 'san_marcos',
    ug_x: 18, ug_y: 400, status: 'Operativo',
    inspector_asignado: 'J. Pérez', ultima_inspeccion: '2026-04-20',
    historial: [
      { fecha: '2026-04-20', texto: 'Caudal 38 m³/s — OK', estado: 'ok' },
    ],
  },
]

const SurfaceMap = dynamic(() => import('./SurfaceMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-900">
      <p className="text-xs text-slate-500 animate-pulse">Cargando mapa satelital…</p>
    </div>
  ),
})

interface KiraMapProps {
  assets: Asset[]
}

interface PendingCoords {
  lat?: number; lng?: number
  ugX?: number; ugY?: number
}

export default function KiraMap({ assets: initialAssets }: KiraMapProps) {
  const [assets,      setAssets]      = useState<Asset[]>(initialAssets)
  const [capa,        setCapa]        = useState<Capa>('superficie')
  const [activeMine,  setActiveMine]  = useState<MineId>('mariana_central')
  const [selectedId,  setSelectedId]  = useState<string | null>(null)
  const [placeMode,   setPlaceMode]   = useState(false)
  const [pending,     setPending]     = useState<PendingCoords | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [tipoFilter,  setTipoFilter]  = useState<string>('')

  // Assets for the current layer/mine (before tipo filter)
  const layerAssets = useMemo(() => {
    if (capa === 'superficie') return assets.filter((a) => a.capa === 'superficie')
    return assets.filter((a) => a.capa === 'subterraneo' && a.mina === activeMine)
  }, [assets, capa, activeMine])

  // Unique tipos for the dropdown (from current layer)
  const tipoOptions = useMemo(() => {
    const tipos = Array.from(new Set(layerAssets.map((a) => a.tipo).filter(Boolean))).sort()
    return tipos
  }, [layerAssets])

  // Final visible assets: layer + tipo filter applied
  const visibleAssets = useMemo(() => {
    if (!tipoFilter) return layerAssets
    return layerAssets.filter((a) => a.tipo === tipoFilter)
  }, [layerAssets, tipoFilter])

  const selectedAsset = useMemo(
    () => assets.find((a) => a.id === selectedId) ?? null,
    [assets, selectedId],
  )

  function handleSelect(asset: Asset) {
    if (placeMode) return  // ignore selection clicks while placing
    setSelectedId((prev) => (prev === asset.id ? null : asset.id))
  }

  function handleLayerChange(layer: Capa) {
    setCapa(layer)
    setSelectedId(null)
    setPlaceMode(false)
    setPending(null)
    setTipoFilter('')
  }

  function handleSurfaceClick(lat: number, lng: number) {
    setPending({ lat, lng })
  }

  function handleUndergroundClick(ugX: number, ugY: number) {
    setPending({ ugX, ugY })
  }

  function handleAssetSaved(asset: Asset) {
    setAssets((prev) => [asset, ...prev])
    setPlaceMode(false)
    setPending(null)
    setSelectedId(asset.id)
  }

  function togglePlaceMode() {
    setPlaceMode((v) => !v)
    setPending(null)
    setSelectedId(null)
  }

  return (
    <div className="flex flex-col md:flex-row h-full min-h-0 bg-slate-900 rounded-2xl overflow-hidden border border-slate-800">

      {/* ── LEFT SIDEBAR ── */}
      <div className="shrink-0 flex flex-col bg-slate-900 border-b md:border-b-0 md:border-r border-slate-800 md:w-[260px] overflow-hidden">

        {/* Logo header */}
        <div className="shrink-0 px-4 py-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                 style={{ backgroundColor: '#1D9E75' }}>
              <svg viewBox="0 0 16 16" className="w-4 h-4 text-white fill-current">
                <path d="M13.5 2.5L6 10 2.5 6.5 1 8l5 5 9-9z" />
              </svg>
            </div>
            <p className="text-sm font-bold flex-1">
              <span style={{ color: '#1D9E75' }}>Kira</span>
              <span className="text-slate-200"> Inspector</span>
            </p>
            {/* Mobile toggle */}
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              className="md:hidden p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
              aria-label="Alternar panel"
            >
              {sidebarOpen
                ? <ChevronUp className="w-4 h-4" />
                : <ChevronDown className="w-4 h-4" />
              }
            </button>
          </div>
        </div>

        {/* Collapsible content on mobile */}
        <div className={cn('flex flex-col overflow-hidden md:flex-1 md:min-h-0', sidebarOpen ? 'flex-1 min-h-0' : 'hidden md:flex md:flex-col md:flex-1 md:min-h-0')}>

        {/* Layer tabs */}
        <div className="shrink-0 p-3 border-b border-slate-800">
          <div className="flex gap-1 p-1 rounded-xl bg-slate-800/60">
            {(['superficie', 'subterraneo'] as Capa[]).map((layer) => (
              <button
                key={layer}
                onClick={() => handleLayerChange(layer)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors',
                  capa === layer ? 'text-white' : 'text-slate-400 hover:text-slate-200',
                )}
                style={capa === layer ? { backgroundColor: '#1D9E75' } : {}}
              >
                <Layers className="w-3.5 h-3.5" />
                {layer === 'superficie' ? 'Superficie' : 'Subterráneo'}
              </button>
            ))}
          </div>
        </div>

        {/* Mine selector (underground only) */}
        {capa === 'subterraneo' && (
          <div className="shrink-0 p-3 border-b border-slate-800">
            <MineSelector activeMine={activeMine} onChange={setActiveMine} />
          </div>
        )}

        {/* Tipo filter dropdown */}
        {tipoOptions.length > 0 && (
          <div className="shrink-0 p-3 border-b border-slate-800">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Filter className="w-3 h-3 text-slate-500" />
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                Tipo de activo
              </p>
              {tipoFilter && (
                <button
                  onClick={() => setTipoFilter('')}
                  className="ml-auto text-[10px] text-sky-400 hover:text-sky-300 transition-colors"
                >
                  Limpiar
                </button>
              )}
            </div>
            <select
              value={tipoFilter}
              onChange={(e) => { setTipoFilter(e.target.value); setSelectedId(null) }}
              className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-xs
                         text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500/50
                         appearance-none cursor-pointer"
            >
              <option value="">Todos los tipos ({layerAssets.length})</option>
              {tipoOptions.map((tipo) => {
                const count = layerAssets.filter((a) => a.tipo === tipo).length
                return (
                  <option key={tipo} value={tipo}>
                    {tipo} ({count})
                  </option>
                )
              })}
            </select>
            {tipoFilter && (
              <p className="text-[10px] text-slate-500 mt-1 text-center">
                {visibleAssets.length} activo{visibleAssets.length !== 1 ? 's' : ''} mostrado{visibleAssets.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        )}

        {/* Add asset button */}
        <div className="shrink-0 p-3 border-b border-slate-800">
          <button
            onClick={togglePlaceMode}
            className={cn(
              'w-full flex items-center justify-center gap-2 py-2 rounded-xl border text-xs font-semibold transition-colors',
              placeMode
                ? 'border-amber-500/50 bg-amber-500/10 text-amber-300'
                : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20',
            )}
          >
            {placeMode ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {placeMode ? 'Cancelar colocación' : 'Colocar activo'}
          </button>
          {placeMode && (
            <p className="text-[10px] text-amber-400/70 text-center mt-1.5">
              Hacé click en el mapa para colocar el pin
            </p>
          )}
        </div>

        {/* Asset list */}
        <div className="flex-1 min-h-0 p-3">
          <AssetList
            assets={visibleAssets}
            selectedId={selectedId}
            onSelect={handleSelect}
          />
        </div>

        </div>{/* end collapsible */}
      </div>

      {/* ── CENTER MAP ── */}
      <div className="flex-1 min-w-0 relative overflow-hidden h-[50vh] md:h-full">
        {capa === 'superficie' ? (
          <SurfaceMap
            assets={visibleAssets}
            selectedId={selectedId}
            onSelect={handleSelect}
            placeMode={placeMode}
            onMapClick={handleSurfaceClick}
          />
        ) : (
          <UndergroundMap
            assets={visibleAssets}
            selectedId={selectedId}
            activeMine={activeMine}
            onSelect={handleSelect}
            placeMode={placeMode}
            onMapClick={handleUndergroundClick}
          />
        )}
      </div>

      {/* ── RIGHT DETAIL PANEL ── */}
      <div className={cn(
        'shrink-0 transition-all duration-300 overflow-hidden',
        selectedAsset ? 'w-[290px]' : 'w-0',
      )}>
        {selectedAsset && (
          <AssetDetailPanel
            asset={selectedAsset}
            onClose={() => setSelectedId(null)}
          />
        )}
      </div>

      {/* ── ASSET FORM MODAL ── */}
      {pending && (
        <AssetFormModal
          capa={capa}
          mina={capa === 'subterraneo' ? activeMine : undefined}
          lat={pending.lat}
          lng={pending.lng}
          ugX={pending.ugX}
          ugY={pending.ugY}
          onSaved={handleAssetSaved}
          onClose={() => setPending(null)}
        />
      )}
    </div>
  )
}

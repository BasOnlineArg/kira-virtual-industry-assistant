'use client'

import { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { Layers, Plus, X, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import AssetList from './AssetList'
import AssetDetailPanel from './AssetDetailPanel'
import MineSelector from './MineSelector'
import UndergroundMap from './UndergroundMap'
import AssetFormModal from './AssetFormModal'
import type { Asset, Capa, MineId } from '@/lib/geo/types'

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

  const visibleAssets = useMemo(() => {
    if (capa === 'superficie') return assets.filter((a) => a.capa === 'superficie')
    return assets.filter((a) => a.capa === 'subterraneo' && a.mina === activeMine)
  }, [assets, capa, activeMine])

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

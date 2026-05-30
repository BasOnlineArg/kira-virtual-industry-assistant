'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { MINE_CONFIG, MINE_GRID_CONFIGS } from '@/lib/geo/constants'
import { gridToPixel, pixelToGrid } from '@/lib/geo/utils'
import AssetPin from './AssetPin'
import type { Asset, MineId } from '@/lib/geo/types'

interface UndergroundMapProps {
  assets:      Asset[]
  selectedId:  string | null
  activeMine:  MineId
  onSelect:    (asset: Asset) => void
  placeMode?:  boolean
  onMapClick?: (ugX: number, ugY: number) => void
}

const MIN_SCALE = 0.4
const MAX_SCALE = 3.0
const SCALE_STEP = 0.25

export default function UndergroundMap({
  assets, selectedId, activeMine, onSelect, placeMode, onMapClick,
}: UndergroundMapProps) {
  const imageRef     = useRef<HTMLImageElement>(null)
  const [scale, setScale]     = useState(1)
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 })

  const mine    = MINE_CONFIG.find((m) => m.id === activeMine)
  const gridCfg = MINE_GRID_CONFIGS[activeMine]

  // Reset zoom when switching mines
  useEffect(() => {
    setScale(1)
    setImgSize({ w: 0, h: 0 })
  }, [activeMine])

  // Track rendered image size for pin positioning
  const updateImgSize = useCallback(() => {
    const img = imageRef.current
    if (!img) return
    setImgSize({ w: img.clientWidth, h: img.clientHeight })
  }, [])

  useEffect(() => {
    const img = imageRef.current
    if (!img) return
    img.addEventListener('load', updateImgSize)
    const ro = new ResizeObserver(updateImgSize)
    ro.observe(img)
    updateImgSize()
    return () => {
      img.removeEventListener('load', updateImgSize)
      ro.disconnect()
    }
  }, [updateImgSize, activeMine])

  function changeScale(delta: number) {
    setScale((s) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, +(s + delta).toFixed(2))))
  }

  if (!mine) return null

  // URL-encode spaces in filename for browser compatibility
  const mapSrc = `/maps/${encodeURIComponent(mine.mapFile)}`

  return (
    <div
      className="relative w-full h-full overflow-hidden flex items-center justify-center"
      style={{ backgroundColor: '#0a0e1a' }}
    >
      {/* Mine badge */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full
                      bg-slate-900/90 border border-slate-700/60 backdrop-blur-sm text-[10px]
                      text-slate-300 font-medium pointer-events-none">
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: mine.color }} />
        {mine.label} · Subterráneo
        {!gridCfg.calibrated && (
          <span className="ml-1 text-amber-400/80">· grilla pendiente calibración</span>
        )}
      </div>

      {/* Scalable wrapper */}
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          transition: 'transform 0.2s ease',
          cursor: placeMode ? 'crosshair' : undefined,
        }}
        className="relative select-none"
        onClick={(e) => {
          if (!placeMode || !onMapClick || !imageRef.current || imgSize.w === 0) return
          const rect = imageRef.current.getBoundingClientRect()
          const px = (e.clientX - rect.left) * (imgSize.w / rect.width)
          const py = (e.clientY - rect.top)  * (imgSize.h / rect.height)
          const { gx, gy } = pixelToGrid(px, py, imgSize.w, imgSize.h, gridCfg)
          onMapClick(gx, gy)
        }}
      >
        {/* Mine plan image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imageRef}
          src={mapSrc}
          alt={`Plano ${mine.label}`}
          className="block max-w-none"
          style={{ maxHeight: 'calc(100vh - 200px)', width: 'auto' }}
          onLoad={updateImgSize}
          draggable={false}
        />

        {/* Pins overlay — positioned over the image */}
        {imgSize.w > 0 && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ width: imgSize.w, height: imgSize.h }}
          >
            {assets.map((asset) => {
              if (asset.ug_x == null || asset.ug_y == null) return null
              const { px, py } = gridToPixel(asset.ug_x, asset.ug_y, imgSize.w, imgSize.h, gridCfg)
              return (
                <div
                  key={asset.id}
                  className="pointer-events-auto"
                  style={{ position: 'absolute', left: px, top: py }}
                >
                  <AssetPin
                    asset={asset}
                    selected={asset.id === selectedId}
                    onClick={() => onSelect(asset)}
                  />
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Zoom controls — bottom right */}
      <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-1">
        {[
          { label: '+', action: () => changeScale(+SCALE_STEP),  title: 'Acercar' },
          { label: '−', action: () => changeScale(-SCALE_STEP),  title: 'Alejar'  },
          { label: '⌂', action: () => setScale(1),               title: 'Reset'   },
        ].map(({ label, action, title }) => (
          <button
            key={label}
            onClick={action}
            title={title}
            className="w-8 h-8 flex items-center justify-center rounded-lg
                       bg-slate-900/90 border border-slate-700/60 text-slate-300
                       hover:bg-slate-800 hover:text-white transition-colors
                       text-sm font-bold shadow-lg backdrop-blur-sm"
          >
            {label}
          </button>
        ))}
        <div className="text-center text-[10px] text-slate-600 mt-0.5 font-mono">
          {Math.round(scale * 100)}%
        </div>
      </div>

      {/* Asset count badge */}
      {assets.length > 0 && (
        <div className="absolute bottom-4 left-3 z-20 px-2.5 py-1 rounded-full
                        bg-slate-900/90 border border-slate-700/60 text-[10px] text-slate-400 font-medium">
          {assets.length} activo{assets.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  )
}

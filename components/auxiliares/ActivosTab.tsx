'use client'

import { useState, useRef, useCallback } from 'react'
import {
  Upload, MapPin, CheckCircle2, AlertCircle, Search,
  Navigation, ExternalLink, Loader2, X,
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface Asset {
  id:               string
  tag:              string
  nombre:           string
  tipo:             string
  sector:           string | null
  mina:             string | null
  lat:              number | null
  lng:              number | null
  status:           string
  ub_tecnica?:      string | null
  ubicacion_fisica?: string | null
  ruta_zona?:       string | null
  frec_sem?:        number | null
  hh_ocurr?:        number | null
  hh_anual?:        number | null
}

type GpsFilter = 'all' | 'with_gps' | 'no_gps'

interface Props {
  initialAssets:  Asset[]
  isSuperusuario: boolean
}

export default function ActivosTab({ initialAssets, isSuperusuario }: Props) {
  const [assets,    setAssets]    = useState<Asset[]>(initialAssets)
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [search,    setSearch]    = useState('')
  const [gpsFilter, setGpsFilter] = useState<GpsFilter>('all')
  const [capturing, setCapturing] = useState<string | null>(null)
  const [gpsMsg,    setGpsMsg]    = useState<{ id: string; type: 'ok' | 'err'; text: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // ── Stats ──────────────────────────────────────────────────────────────────
  const withGps = assets.filter((a) => a.lat != null && a.lng != null).length
  const noGps   = assets.length - withGps

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filtered = assets.filter((a) => {
    const q = search.toLowerCase()
    const matchSearch = !q || [
      a.tag, a.nombre, a.tipo, a.sector ?? '',
      a.ub_tecnica ?? '', a.ubicacion_fisica ?? '', a.ruta_zona ?? '',
    ].some((v) => v.toLowerCase().includes(q))

    const matchGps =
      gpsFilter === 'all'      ? true :
      gpsFilter === 'with_gps' ? a.lat != null :
                                  a.lat == null
    return matchSearch && matchGps
  })

  // ── Import ─────────────────────────────────────────────────────────────────
  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportMsg(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res  = await fetch('/api/assets/import', { method: 'POST', body: formData })
      const data = await res.json()
      console.log('[Assets import]', res.status, data)

      if (!res.ok) {
        setImportMsg({ type: 'err', text: data.error ?? 'Error al importar' })
      } else {
        setImportMsg({
          type: 'ok',
          text: `${data.upserted} activos importados (${data.parsed} detectados en "${data.sheet}")`,
        })
        const listRes = await fetch('/api/assets')
        if (listRes.ok) setAssets(await listRes.json())
      }
    } catch {
      setImportMsg({ type: 'err', text: 'Error de conexión' })
    } finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  // ── GPS capture ────────────────────────────────────────────────────────────
  const captureGps = useCallback((asset: Asset) => {
    if (!navigator.geolocation) {
      setGpsMsg({ id: asset.id, type: 'err', text: 'GPS no disponible en este navegador' })
      return
    }
    setCapturing(asset.id)
    setGpsMsg(null)

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        try {
          const res = await fetch('/api/assets/gps', {
            method:  'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ id: asset.id, lat, lng }),
          })
          if (res.ok) {
            setAssets((prev) => prev.map((a) => a.id === asset.id ? { ...a, lat, lng } : a))
            setGpsMsg({ id: asset.id, type: 'ok', text: `${lat.toFixed(6)}, ${lng.toFixed(6)}` })
          } else {
            const d = await res.json()
            setGpsMsg({ id: asset.id, type: 'err', text: d.error ?? 'Error al guardar GPS' })
          }
        } catch {
          setGpsMsg({ id: asset.id, type: 'err', text: 'Error de conexión' })
        } finally {
          setCapturing(null)
        }
      },
      (err) => {
        setCapturing(null)
        setGpsMsg({ id: asset.id, type: 'err', text: `GPS denegado: ${err.message}` })
      },
      { enableHighAccuracy: true, timeout: 15000 }
    )
  }, [])

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total activos', value: assets.length,  color: 'text-slate-100' },
          { label: 'Con GPS',       value: withGps,        color: 'text-emerald-400' },
          { label: 'Sin GPS',       value: noGps,          color: noGps > 0 ? 'text-amber-400' : 'text-slate-500' },
        ].map((s) => (
          <div key={s.label} className="bg-slate-800/40 border border-slate-700/40 rounded-xl px-4 py-3">
            <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por código SAP, equipo, área, ruta..."
            className="w-full pl-8 pr-8 py-2 rounded-xl bg-slate-800/60 border border-slate-700/50
                       text-sm text-slate-200 placeholder:text-slate-600
                       focus:outline-none focus:ring-1 focus:ring-sky-500/50"
          />
          {search && (
            <button onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* GPS filter */}
        <div className="flex gap-1 bg-slate-800/60 border border-slate-700/50 rounded-xl p-0.5">
          {([
            { key: 'all',      label: 'Todos' },
            { key: 'with_gps', label: '✓ GPS' },
            { key: 'no_gps',   label: '⚠ Sin GPS' },
          ] as const).map((opt) => (
            <button key={opt.key} onClick={() => setGpsFilter(opt.key)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                gpsFilter === opt.key ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
              )}>
              {opt.label}
            </button>
          ))}
        </div>

        {/* Import */}
        {isSuperusuario && (
          <>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={importing}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-600
                         hover:border-sky-500/50 text-slate-300 hover:text-white text-sm
                         transition-colors disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              {importing ? 'Importando...' : 'Importar desde Excel'}
            </button>
          </>
        )}
      </div>

      {/* Import feedback */}
      {importMsg && (
        <div className={cn(
          'flex items-start gap-2 text-xs px-3 py-2.5 rounded-xl border',
          importMsg.type === 'ok'
            ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5'
            : 'text-red-400 border-red-500/20 bg-red-500/5'
        )}>
          {importMsg.type === 'ok'
            ? <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
            : <AlertCircle  className="w-4 h-4 flex-shrink-0 mt-0.5" />
          }
          <span>
            {importMsg.text}
            {importMsg.type === 'ok' && (
              <span className="text-slate-500 ml-1">
                · GPS pendientes: asigná desde aquí o en{' '}
                <Link href="/geo" className="text-sky-400 hover:underline">Geolocalización</Link>
              </span>
            )}
          </span>
        </div>
      )}

      {/* Table */}
      {assets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-600 gap-3">
          <Upload className="w-8 h-8 opacity-30" />
          <p className="text-sm">Sin activos cargados</p>
          {isSuperusuario && (
            <p className="text-xs">Importá el Registro Maestro Excel (primera hoja)</p>
          )}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex items-center justify-center py-10 text-slate-600 text-sm">
          {`Sin resultados para "${search}"`}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-700/40">
          <table className="w-full min-w-[1000px] text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-700/40 bg-slate-800/60">
                {[
                  { label: 'N°',              cls: 'w-10  text-center' },
                  { label: 'Código SAP (FL)', cls: 'w-36' },
                  { label: 'Categoría',       cls: 'w-28 hidden md:table-cell' },
                  { label: 'Equipo',          cls: '' },
                  { label: 'Ubic. Física',    cls: 'w-28 hidden lg:table-cell' },
                  { label: 'Área',            cls: 'w-24 hidden lg:table-cell' },
                  { label: 'Ruta / Zona',     cls: 'w-32 hidden xl:table-cell' },
                  { label: 'Frec.',           cls: 'w-14 text-center hidden xl:table-cell' },
                  { label: 'HH Oc.',          cls: 'w-14 text-center hidden xl:table-cell' },
                  { label: 'HH An.',          cls: 'w-14 text-center hidden xl:table-cell' },
                  { label: 'GPS',             cls: 'w-14 text-center' },
                  { label: 'Acciones',        cls: 'w-36 text-right' },
                ].map((h) => (
                  <th key={h.label}
                    className={cn('px-3 py-2.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider text-left', h.cls)}>
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((asset, idx) => {
                const hasGps      = asset.lat != null && asset.lng != null
                const isCapturing = capturing === asset.id
                const msg         = gpsMsg?.id === asset.id ? gpsMsg : null

                return (
                  <tr key={asset.id}
                    className={cn(
                      'border-b border-slate-700/20 last:border-b-0 hover:bg-slate-800/30 transition-colors',
                      idx % 2 === 0 ? 'bg-slate-800/10' : 'bg-transparent'
                    )}>

                    {/* N° */}
                    <td className="px-3 py-2 text-center text-slate-600">{idx + 1}</td>

                    {/* Código SAP */}
                    <td className="px-3 py-2">
                      {asset.ub_tecnica ? (
                        <span className="font-mono text-[10px] text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded whitespace-nowrap">
                          {asset.ub_tecnica}
                        </span>
                      ) : (
                        <span className="font-mono text-[10px] text-slate-600 bg-slate-800/60 px-1.5 py-0.5 rounded">
                          {asset.tag}
                        </span>
                      )}
                    </td>

                    {/* Categoría */}
                    <td className="px-3 py-2 hidden md:table-cell">
                      <span className="text-slate-400">{asset.tipo || '—'}</span>
                    </td>

                    {/* Equipo */}
                    <td className="px-3 py-2">
                      <p className="font-medium text-slate-200 leading-snug">{asset.nombre}</p>
                      {msg && (
                        <p className={cn('text-[10px] mt-0.5', msg.type === 'ok' ? 'text-emerald-400' : 'text-red-400')}>
                          {msg.type === 'ok' ? '📍 ' : '⚠ '}{msg.text}
                        </p>
                      )}
                    </td>

                    {/* Ubic. Física */}
                    <td className="px-3 py-2 hidden lg:table-cell text-slate-500">
                      {asset.ubicacion_fisica || '—'}
                    </td>

                    {/* Área */}
                    <td className="px-3 py-2 hidden lg:table-cell text-slate-500">
                      {asset.sector || '—'}
                    </td>

                    {/* Ruta */}
                    <td className="px-3 py-2 hidden xl:table-cell">
                      {asset.ruta_zona ? (
                        <span className="text-[10px] text-violet-300 bg-violet-500/10 border border-violet-500/20 rounded-full px-2 py-0.5 whitespace-nowrap">
                          {asset.ruta_zona}
                        </span>
                      ) : <span className="text-slate-600">—</span>}
                    </td>

                    {/* Frec. */}
                    <td className="px-3 py-2 hidden xl:table-cell text-center text-slate-400">
                      {asset.frec_sem != null ? `${asset.frec_sem}s` : '—'}
                    </td>

                    {/* HH Ocurr */}
                    <td className="px-3 py-2 hidden xl:table-cell text-center text-slate-400">
                      {asset.hh_ocurr ?? '—'}
                    </td>

                    {/* HH Anual */}
                    <td className="px-3 py-2 hidden xl:table-cell text-center text-slate-400">
                      {asset.hh_anual ?? '—'}
                    </td>

                    {/* GPS */}
                    <td className="px-3 py-2 text-center">
                      {hasGps ? (
                        <span title={`${asset.lat?.toFixed(5)}, ${asset.lng?.toFixed(5)}`}
                          className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/10">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/10">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                        </span>
                      )}
                    </td>

                    {/* Acciones */}
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => captureGps(asset)}
                          disabled={isCapturing}
                          className={cn(
                            'flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-colors disabled:opacity-50',
                            hasGps
                              ? 'text-slate-500 border border-slate-700/50 hover:text-slate-300'
                              : 'text-amber-400 border border-amber-500/30 hover:bg-amber-500/10'
                          )}
                          title="Capturar GPS del dispositivo actual"
                        >
                          {isCapturing
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : <Navigation className="w-3 h-3" />
                          }
                          {hasGps ? 'GPS' : 'Capturar'}
                        </button>
                        <Link href="/geo"
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-slate-500
                                     border border-slate-700/40 hover:text-sky-400 hover:border-sky-500/30 transition-colors"
                          title="Ver en mapa">
                          <MapPin className="w-3 h-3" />
                          Mapa
                        </Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-slate-700/30 bg-slate-800/20 flex items-center justify-between">
            <p className="text-[10px] text-slate-600">
              {filtered.length} de {assets.length} activos
              {noGps > 0 && <span className="text-amber-600 ml-2">· {noGps} sin GPS</span>}
            </p>
            <Link href="/geo"
              className="flex items-center gap-1.5 text-[10px] text-sky-500 hover:text-sky-400 transition-colors">
              <ExternalLink className="w-3 h-3" />
              Asignar GPS desde el mapa
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

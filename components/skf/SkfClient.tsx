'use client'

import { useState } from 'react'
import { Loader2, BarChart2, History, FileSearch } from 'lucide-react'
import { cn } from '@/lib/utils'
import SkfDropzone from './SkfDropzone'
import SkfMeasurementTable, { type SkfPoint, getZone, getEstado } from './SkfMeasurementTable'
import SkfResult, { type SkfAnalysisResult } from './SkfResult'
import SkfHistory, { type SkfMeasurementRow } from './SkfHistory'

interface SkfClientProps {
  initialHistory: SkfMeasurementRow[]
}

type RightTab = 'measurements' | 'result' | 'history'

const ISO_CLASSES = [
  { value: 'I',   label: 'Clase I',   sub: 'Pequeña <15 kW' },
  { value: 'II',  label: 'Clase II',  sub: 'Mediana 15–75 kW' },
  { value: 'III', label: 'Clase III', sub: 'Grande rígida' },
  { value: 'IV',  label: 'Clase IV',  sub: 'Grande flexible' },
]

/* ─── CSV parser for SKF QuickCollect exports ─────────────────── */
function parseCsv(text: string): { points: SkfPoint[]; fecha?: string; assetFromFile?: string } {
  const lines = text.trim().split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return { points: [] }

  // Detect separator
  const sep = lines[0].includes(';') ? ';' : lines[0].includes('\t') ? '\t' : ','
  const raw = lines.map((l) => l.split(sep).map((c) => c.trim().replace(/^"|"$/g, '')))
  const header = raw[0].map((h) => h.toLowerCase())

  // Column finders
  function col(...keys: string[]): number {
    for (const k of keys) {
      const i = header.findIndex((h) => h.includes(k))
      if (i !== -1) return i
    }
    return -1
  }

  const idxPunto = col('point', 'punto', 'location', 'measurement', 'sensor')
  const idxVel   = col('veloc', 'mm/s', 'vrms', 'rms')
  const idxEnv   = col('envel', 'ge', 'acoustic', 'accel')
  const idxTemp  = col('temp')
  const idxFecha = col('date', 'fecha', 'time', 'timestamp')
  const idxAsset = col('asset', 'equip', 'machine', 'tag')

  const points: SkfPoint[] = []
  let fecha: string | undefined
  let assetFromFile: string | undefined

  for (let i = 1; i < raw.length; i++) {
    const row = raw[i]
    if (!row || row.every((c) => !c)) continue

    const velRaw = idxVel !== -1 ? parseFloat(row[idxVel].replace(',', '.')) : NaN
    const envRaw = idxEnv !== -1 ? parseFloat(row[idxEnv].replace(',', '.')) : 0
    const tmpRaw = idxTemp !== -1 ? parseFloat(row[idxTemp].replace(',', '.')) : 0

    if (isNaN(velRaw)) continue

    if (!fecha && idxFecha !== -1 && row[idxFecha]) fecha = row[idxFecha]
    if (!assetFromFile && idxAsset !== -1 && row[idxAsset]) assetFromFile = row[idxAsset]

    points.push({
      punto: idxPunto !== -1 ? (row[idxPunto] || `Punto ${i}`) : `Punto ${i}`,
      velocityRms: velRaw,
      envelopeGe:  isNaN(envRaw) ? 0 : envRaw,
      temperatura:  isNaN(tmpRaw) ? 0 : tmpRaw,
      fecha: idxFecha !== -1 ? row[idxFecha] : undefined,
    })
  }

  return { points, fecha, assetFromFile }
}

export default function SkfClient({ initialHistory }: SkfClientProps) {
  /* ── files ── */
  const [files, setFiles] = useState<{ csv: File | null; pdf: File | null }>({ csv: null, pdf: null })
  const [parseError, setParseError] = useState('')

  /* ── parsed data ── */
  const [points, setPoints]           = useState<SkfPoint[]>([])
  const [parsedFecha, setParsedFecha] = useState('')
  const [parsedTag, setParsedTag]     = useState('')

  /* ── form ── */
  const [tag, setTag]               = useState('')
  const [tipoEquipo, setTipoEquipo] = useState('')
  const [isoClass, setIsoClass]     = useState('II')
  const [observaciones, setObs]     = useState('')

  /* ── async ── */
  const [parsing, setParsing]   = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult]     = useState<SkfAnalysisResult | null>(null)
  const [history, setHistory]   = useState<SkfMeasurementRow[]>(initialHistory)
  const [rightTab, setRightTab] = useState<RightTab>('measurements')

  /* ── Parse CSV when file is set ── */
  async function handleFilesChange(newFiles: typeof files) {
    setFiles(newFiles)
    setParseError('')
    if (!newFiles.csv) { setPoints([]); return }

    setParsing(true)
    try {
      const text = await newFiles.csv.text()
      const { points: parsed, fecha, assetFromFile } = parseCsv(text)
      if (parsed.length === 0) {
        setParseError('No se encontraron mediciones en el CSV. Verificá el formato SKF QuickCollect.')
        setPoints([])
      } else {
        setPoints(parsed)
        if (fecha) setParsedFecha(fecha)
        if (assetFromFile && !tag) { setTag(assetFromFile); setParsedTag(assetFromFile) }
        setRightTab('measurements')
      }
    } catch {
      setParseError('Error al leer el archivo CSV.')
    } finally {
      setParsing(false)
    }
  }

  /* ── Analyze with KIRA ── */
  async function handleAnalyze() {
    if (!tag.trim() || points.length === 0) return
    setAnalyzing(true)
    try {
      // Build form data — PDF is sent as base64 if present
      let pdfBase64: string | null = null
      if (files.pdf) {
        const buf = await files.pdf.arrayBuffer()
        const bytes = new Uint8Array(buf)
        let binary = ''
        bytes.forEach((b) => (binary += String.fromCharCode(b)))
        pdfBase64 = btoa(binary)
      }

      const res = await fetch('/api/skf/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tag: tag.trim(),
          tipoEquipo,
          isoClass,
          observaciones,
          points,
          pdfBase64,
          fecha: parsedFecha || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error')

      // Pick worst point for the result
      const worstPoint = points.reduce((w, p) =>
        p.velocityRms > w.velocityRms ? p : w, points[0])

      const analysisResult: SkfAnalysisResult = {
        ...data,
        velocityRms: worstPoint.velocityRms,
        envelopeGe:  worstPoint.envelopeGe,
        temperatura:  worstPoint.temperatura,
        isoClass,
        tipoEquipo,
        puntoMedicion: worstPoint.punto,
        points,
      }
      setResult(analysisResult)
      setRightTab('result')

      // Optimistic history prepend
      if (data.id) {
        const newRow: SkfMeasurementRow = {
          id: data.id,
          asset_tag: tag.trim(),
          tipo_equipo: tipoEquipo || null,
          punto_medicion: worstPoint.punto,
          velocity_rms: worstPoint.velocityRms,
          envelope_ge:  worstPoint.envelopeGe,
          temperatura:   worstPoint.temperatura,
          iso_class: isoClass,
          estado: data.estado,
          falla_prob: data.probabilidad_falla,
          rul: data.rul,
          diagnostico: data.diagnostico,
          fecha: data.fecha,
          inspector_id: '',
        }
        setHistory((prev) => [newRow, ...prev])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setAnalyzing(false)
    }
  }

  /* ── history select ── */
  function handleHistorySelect(row: SkfMeasurementRow) {
    setResult({
      id: row.id,
      tag: row.asset_tag ?? '',
      zone: getZone(row.velocity_rms ?? 0, row.iso_class ?? 'II'),
      estado: (row.estado as 'verde' | 'amarillo' | 'rojo') ?? 'amarillo',
      diagnostico: row.diagnostico ?? '',
      probabilidad_falla: row.falla_prob,
      rul: row.rul,
      patron_falla: null,
      recomendaciones: null,
      fecha: row.fecha,
      inspector_name: '',
      velocityRms: row.velocity_rms ?? 0,
      envelopeGe:  row.envelope_ge  ?? 0,
      temperatura:  row.temperatura  ?? 0,
      isoClass: row.iso_class ?? 'II',
      tipoEquipo: row.tipo_equipo ?? '',
      puntoMedicion: row.punto_medicion ?? '',
    })
    setRightTab('result')
  }

  const canAnalyze = !!tag.trim() && points.length > 0 && !analyzing

  return (
    <div className="flex flex-col md:flex-row gap-6 h-full">
      {/* ── LEFT PANEL ── */}
      <div className="w-full md:w-80 xl:w-96 flex-shrink-0 space-y-4">

        {/* Dropzone */}
        <div className="bg-slate-800/40 border border-slate-700/30 rounded-2xl p-4">
          <SkfDropzone files={files} onChange={handleFilesChange} disabled={analyzing} />
          {parsing && (
            <div className="flex items-center gap-2 mt-3 text-xs text-slate-500">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Leyendo CSV…
            </div>
          )}
          {parseError && <p className="mt-2 text-xs text-red-400">{parseError}</p>}
          {points.length > 0 && !parseError && (
            <p className="mt-2 text-xs text-emerald-400">
              ✓ {points.length} punto{points.length > 1 ? 's' : ''} de medición detectado{points.length > 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Identification */}
        <div className="bg-slate-800/40 border border-slate-700/30 rounded-2xl p-4 space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Identificación
          </p>
          <div>
            <label className="kira-label">TAG del activo *</label>
            <input
              type="text"
              placeholder={parsedTag || 'Ej: MOT-001, BOM-07A'}
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              disabled={analyzing}
              className="kira-input mt-1"
            />
          </div>
          <div>
            <label className="kira-label">Tipo de equipo</label>
            <input
              type="text"
              placeholder="Ej: Motor eléctrico, Bomba centrífuga"
              value={tipoEquipo}
              onChange={(e) => setTipoEquipo(e.target.value)}
              disabled={analyzing}
              className="kira-input mt-1"
            />
          </div>
        </div>

        {/* ISO Class */}
        <div className="bg-slate-800/40 border border-slate-700/30 rounded-2xl p-4 space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Clase ISO 10816
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {ISO_CLASSES.map((cls) => (
              <button
                key={cls.value}
                onClick={() => setIsoClass(cls.value)}
                disabled={analyzing}
                className={cn(
                  'text-left px-3 py-2 rounded-lg border text-xs transition-colors',
                  isoClass === cls.value
                    ? 'border-sky-500/50 bg-sky-500/10 text-sky-300'
                    : 'border-slate-700/50 bg-slate-900/30 text-slate-400 hover:text-slate-200'
                )}
              >
                <span className="font-semibold block">{cls.label}</span>
                <span className="text-[10px] text-slate-500">{cls.sub}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Observations */}
        <div className="bg-slate-800/40 border border-slate-700/30 rounded-2xl p-4">
          <label className="kira-label">Observaciones del inspector</label>
          <textarea
            rows={3}
            placeholder="Ruido inusual, vibración, temperatura elevada…"
            value={observaciones}
            onChange={(e) => setObs(e.target.value)}
            disabled={analyzing}
            className="kira-input mt-1 resize-none w-full"
          />
        </div>

        {/* Analyze */}
        <button
          onClick={handleAnalyze}
          disabled={!canAnalyze}
          className="kira-btn-primary w-full flex items-center justify-center gap-2"
        >
          {analyzing ? (
            <><Loader2 className="w-4 h-4 animate-spin" />Analizando con KIRA…</>
          ) : (
            <><FileSearch className="w-4 h-4" />Analizar con KIRA</>
          )}
        </button>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="flex-1 min-w-0">
        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-slate-800/40 border border-slate-700/30 rounded-xl p-1">
          {([
            { id: 'measurements', label: 'Mediciones', icon: BarChart2 },
            { id: 'result',       label: 'Diagnóstico', icon: FileSearch },
            { id: 'history',      label: 'Historial',   icon: History },
          ] as { id: RightTab; label: string; icon: typeof BarChart2 }[]).map((t) => (
            <button
              key={t.id}
              onClick={() => setRightTab(t.id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg transition-colors',
                rightTab === t.id
                  ? 'bg-sky-600 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              )}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        <div className="bg-slate-800/40 border border-slate-700/30 rounded-2xl p-4 overflow-x-auto overflow-y-auto min-h-64">
          {/* Measurements tab */}
          {rightTab === 'measurements' && (
            points.length > 0 ? (
              <SkfMeasurementTable
                points={points}
                isoClass={isoClass}
                assetTag={tag || parsedTag || '—'}
                fecha={parsedFecha}
              />
            ) : (
              <div className="flex flex-col items-center gap-3 py-10 md:py-20 text-slate-600">
                <div className="w-12 h-12 rounded-xl bg-[#005CB9]/20 flex items-center justify-center">
                  <span className="text-sm font-black text-[#005CB9]/60">SKF</span>
                </div>
                <p className="text-sm">Cargá el CSV de QuickCollect para ver las mediciones</p>
              </div>
            )
          )}

          {/* Result tab */}
          {rightTab === 'result' && (
            result ? (
              <SkfResult result={result} />
            ) : (
              <div className="flex flex-col items-center gap-3 py-10 md:py-20 text-slate-600">
                <FileSearch className="w-10 h-10" />
                <p className="text-sm">
                  {points.length > 0
                    ? 'Hacé click en "Analizar con KIRA" para obtener el diagnóstico'
                    : 'Cargá el CSV primero'}
                </p>
              </div>
            )
          )}

          {/* History tab */}
          {rightTab === 'history' && (
            <SkfHistory rows={history} onSelect={handleHistorySelect} />
          )}
        </div>
      </div>
    </div>
  )
}

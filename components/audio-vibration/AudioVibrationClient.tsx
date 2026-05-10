'use client'

import { useState, useCallback } from 'react'
import { Loader2, Play, BarChart2, History } from 'lucide-react'
import dynamic from 'next/dynamic'

import AudioDropzone from './AudioDropzone'
import FilterControls from './FilterControls'
import MetricsPanel from './MetricsPanel'
import AudioHistory, { type AudioAnalysisRow } from './AudioHistory'
import SonomatResult from './SonomatResult'
import { processAudio, type AudioMetrics, type DspConfig } from '@/lib/dsp/processor'
import { cn } from '@/lib/utils'

// Chart.js must be loaded client-only
const DspCharts = dynamic(() => import('./DspCharts'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-48 text-slate-600 text-sm">
      Cargando gráficas…
    </div>
  ),
})

interface AnalysisResult {
  id: string | null
  tag: string
  diagnostico: string
  probabilidad_falla: number | null
  rul: string | null
  patron_falla: string | null
  frecuencias_caracteristicas: string | null
  recomendaciones: string | null
  metrics: AudioMetrics
  fecha: string
  inspector_name: string
}

interface AudioVibrationClientProps {
  initialHistory: AudioAnalysisRow[]
}

type RightTab = 'charts' | 'result' | 'history'

const DEFAULT_CONFIG: DspConfig = {
  bandpass: null,
  whiteNoiseReduction: false,
}

export default function AudioVibrationClient({ initialHistory }: AudioVibrationClientProps) {
  /* ── file & form ── */
  const [file, setFile] = useState<File | null>(null)
  const [tag, setTag] = useState('')
  const [tipoEquipo, setTipoEquipo] = useState('')
  const [observation, setObservation] = useState('')
  const [config, setConfig] = useState<DspConfig>(DEFAULT_CONFIG)

  /* ── processing ── */
  const [processing, setProcessing] = useState(false)
  const [processingStep, setProcessingStep] = useState('')
  const [metrics, setMetrics] = useState<AudioMetrics | null>(null)
  const [analyzing, setAnalyzing] = useState(false)

  /* ── result & history ── */
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [history, setHistory] = useState<AudioAnalysisRow[]>(initialHistory)
  const [rightTab, setRightTab] = useState<RightTab>('charts')

  /* ── clear ── */
  function handleClear() {
    setFile(null)
    setMetrics(null)
    setResult(null)
    setProcessingStep('')
  }

  /* ── run DSP ── */
  const handleProcess = useCallback(async () => {
    if (!file) return
    setProcessing(true)
    setMetrics(null)
    setResult(null)
    setProcessingStep('Decodificando audio…')
    try {
      const m = await processAudio(file, config)
      setMetrics(m)
      setRightTab('charts')
      setProcessingStep('')
    } catch (e) {
      console.error(e)
      setProcessingStep('Error al procesar la señal.')
    } finally {
      setProcessing(false)
    }
  }, [file, config])

  /* ── send to Claude ── */
  async function handleAnalyze() {
    if (!metrics || !tag.trim()) return
    setAnalyzing(true)
    try {
      const res = await fetch('/api/audio-vibration/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tag: tag.trim(),
          tipoEquipo,
          observation,
          metrics: {
            sampleRate: metrics.sampleRate,
            duration: metrics.duration,
            rms: metrics.rms,
            kurtosis: metrics.kurtosis,
            crestFactor: metrics.crestFactor,
            aeaRms: metrics.aeaRms,
            aeaPercentage: metrics.aeaPercentage,
            dominantFrequency: metrics.dominantFrequency,
            peakFrequencies: metrics.peakFrequencies,
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error')
      setResult({ ...data, metrics })
      setRightTab('result')
      // prepend to history (optimistic)
      if (data.id) {
        const newRow: AudioAnalysisRow = {
          id: data.id,
          asset_tag: data.tag,
          tipo_equipo: tipoEquipo || null,
          kurtosis: metrics.kurtosis,
          crest_factor: metrics.crestFactor,
          falla_prob: data.probabilidad_falla,
          rul: data.rul,
          diagnostico: data.diagnostico,
          fecha: data.fecha,
          inspector_id: '',
          rms: metrics.rms,
          aea_level: metrics.aeaRms,
          peak_freq: metrics.dominantFrequency,
        }
        setHistory((prev) => [newRow, ...prev])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setAnalyzing(false)
    }
  }

  /* ── load from history ── */
  function handleHistorySelect(row: AudioAnalysisRow) {
    // Show a lightweight result view from the DB row (charts not available)
    const stub: AudioMetrics = metrics ?? {
      sampleRate: 0, duration: 0, nSamples: 0,
      rms: row.rms, kurtosis: row.kurtosis, crestFactor: row.crest_factor, peak: 0,
      dominantFrequency: row.peak_freq ?? 0, peakFrequencies: [],
      aeaRms: row.aea_level ?? 0, aeaPercentage: 0,
      twf: { times: [], amplitudes: [] },
      fftSpectrum: { frequencies: [], magnitudesDb: [] },
      psd: { frequencies: [], powerDb: [] },
      aeaEnvelope: { times: [], levels: [] },
      spectrogram: { times: [], frequencies: [], magnitudes: [] },
    }
    setResult({
      id: row.id,
      tag: row.asset_tag,
      diagnostico: row.diagnostico ?? '',
      probabilidad_falla: row.falla_prob,
      rul: row.rul,
      patron_falla: null,
      frecuencias_caracteristicas: null,
      recomendaciones: null,
      metrics: stub,
      fecha: row.fecha,
      inspector_name: '',
    })
    setTipoEquipo(row.tipo_equipo ?? '')
    setRightTab('result')
  }

  const canProcess = !!file && !processing
  const canAnalyze = !!metrics && !!tag.trim() && !analyzing

  return (
    <div className="flex flex-col md:flex-row gap-6 h-full">
      {/* ── LEFT PANEL ───────────────────────────────────── */}
      <div className="w-full md:w-80 xl:w-96 flex-shrink-0 space-y-4">
        {/* File */}
        <div className="bg-slate-800/40 border border-slate-700/30 rounded-2xl p-4 space-y-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Señal de audio / vibración
          </p>
          <AudioDropzone
            file={file}
            onFileChange={(f) => { setFile(f); setMetrics(null); setResult(null) }}
            onClear={handleClear}
            disabled={processing || analyzing}
          />
        </div>

        {/* Metadata */}
        <div className="bg-slate-800/40 border border-slate-700/30 rounded-2xl p-4 space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Identificación del activo
          </p>
          <div>
            <label className="kira-label">TAG del activo *</label>
            <input
              type="text"
              placeholder="Ej: BOM-001, MOT-07A"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              disabled={processing || analyzing}
              className="kira-input mt-1"
            />
          </div>
          <div>
            <label className="kira-label">Tipo de equipo</label>
            <input
              type="text"
              placeholder="Ej: Bomba centrifuga, Motor eléctrico"
              value={tipoEquipo}
              onChange={(e) => setTipoEquipo(e.target.value)}
              disabled={processing || analyzing}
              className="kira-input mt-1"
            />
          </div>
          <div>
            <label className="kira-label">Observaciones del inspector</label>
            <textarea
              rows={3}
              placeholder="Ruido inusual, vibración en el eje, temperatura elevada…"
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              disabled={processing || analyzing}
              className="kira-input mt-1 resize-none"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="bg-slate-800/40 border border-slate-700/30 rounded-2xl p-4">
          <FilterControls
            config={config}
            onChange={setConfig}
            disabled={processing || analyzing}
          />
        </div>

        {/* Process button */}
        <button
          onClick={handleProcess}
          disabled={!canProcess}
          className="kira-btn-primary w-full flex items-center justify-center gap-2"
        >
          {processing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {processingStep || 'Procesando…'}
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Procesar señal
            </>
          )}
        </button>

        {/* Analyze with KIRA */}
        {metrics && (
          <button
            onClick={handleAnalyze}
            disabled={!canAnalyze}
            className="kira-btn-secondary w-full flex items-center justify-center gap-2"
          >
            {analyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analizando con KIRA…
              </>
            ) : (
              <>
                <BarChart2 className="w-4 h-4" />
                Analizar con KIRA
              </>
            )}
          </button>
        )}

        {/* Metrics */}
        {metrics && (
          <div className="bg-slate-800/40 border border-slate-700/30 rounded-2xl p-4">
            <MetricsPanel metrics={metrics} />
          </div>
        )}
      </div>

      {/* ── RIGHT PANEL ──────────────────────────────────── */}
      <div className="flex-1 min-w-0">
        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-slate-800/40 border border-slate-700/30 rounded-xl p-1">
          {(
            [
              { id: 'charts', label: 'Gráficas DSP', icon: BarChart2 },
              { id: 'result', label: 'Diagnóstico', icon: BarChart2 },
              { id: 'history', label: 'Historial', icon: History },
            ] as { id: RightTab; label: string; icon: typeof BarChart2 }[]
          ).map((t) => (
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
          {/* Charts tab */}
          {rightTab === 'charts' && (
            metrics ? (
              <DspCharts metrics={metrics} />
            ) : (
              <div className="flex flex-col items-center gap-3 py-10 md:py-20 text-slate-600">
                <BarChart2 className="w-10 h-10" />
                <p className="text-sm">Cargá un archivo y procesá la señal para ver las gráficas</p>
              </div>
            )
          )}

          {/* Result tab */}
          {rightTab === 'result' && (
            result ? (
              <SonomatResult result={result} tipoEquipo={tipoEquipo} />
            ) : (
              <div className="flex flex-col items-center gap-3 py-10 md:py-20 text-slate-600">
                <BarChart2 className="w-10 h-10" />
                <p className="text-sm">
                  {metrics
                    ? 'Hacé click en "Analizar con KIRA" para obtener el diagnóstico'
                    : 'Procesá una señal primero'}
                </p>
              </div>
            )
          )}

          {/* History tab */}
          {rightTab === 'history' && (
            <AudioHistory rows={history} onSelect={handleHistorySelect} />
          )}
        </div>
      </div>
    </div>
  )
}

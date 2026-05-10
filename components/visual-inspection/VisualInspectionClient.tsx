'use client'

import { useState } from 'react'
import { Loader2, Camera, History } from 'lucide-react'
import ImageDropzone from './ImageDropzone'
import DiagnosisResult, { type AnalysisResult } from './DiagnosisResult'
import AnalysisHistory from './AnalysisHistory'
import { cn } from '@/lib/utils'

interface HistoryItem {
  id: string
  asset_tag: string | null
  severidad: string | null
  diagnostico: string | null
  foto_url: string | null
  fecha: string
  inspector_name?: string
}

interface VisualInspectionClientProps {
  initialHistory: HistoryItem[]
}

type Tab = 'resultado' | 'historial'

export default function VisualInspectionClient({ initialHistory }: VisualInspectionClientProps) {
  // Form state
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [tag, setTag] = useState('')
  const [observation, setObservation] = useState('')

  // Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<AnalysisResult | null>(null)

  // History state
  const [history, setHistory] = useState<HistoryItem[]>(initialHistory)
  const [activeTab, setActiveTab] = useState<Tab>('resultado')
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null)

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleFileChange(file: File, previewUrl: string) {
    setImageFile(file)
    setPreview(previewUrl)
    setError(null)
  }

  function handleClear() {
    setImageFile(null)
    setPreview(null)
    setError(null)
  }

  async function handleAnalyze() {
    if (!imageFile || !tag.trim()) return
    setIsAnalyzing(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('image', imageFile)
      formData.append('tag', tag.trim())
      formData.append('observation', observation.trim())

      const res = await fetch('/api/visual-inspection/analyze', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Error al analizar la imagen.')
        return
      }

      const analysisResult: AnalysisResult = {
        id: data.id,
        tag: data.tag,
        diagnostico: data.diagnostico,
        severidad: data.severidad,
        base_metodologica: data.base_metodologica,
        recomendaciones: data.recomendaciones,
        foto_url: data.foto_url,
        fecha: data.fecha,
        inspector_name: data.inspector_name,
      }

      setResult(analysisResult)
      setActiveTab('resultado')
      setActiveHistoryId(data.id)

      // Prepend to history
      if (data.id) {
        setHistory((prev) => [
          {
            id: data.id,
            asset_tag: data.tag,
            severidad: data.severidad,
            diagnostico: data.diagnostico,
            foto_url: data.foto_url,
            fecha: data.fecha,
            inspector_name: data.inspector_name,
          },
          ...prev,
        ])
      }
    } catch {
      setError('Error de conexión. Verificá tu red e intentá de nuevo.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  function handleHistorySelect(item: AnalysisResult) {
    setResult(item)
    setActiveHistoryId(item.id)
    setActiveTab('resultado')
  }

  const canAnalyze = !!imageFile && !!tag.trim() && !isAnalyzing

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col md:flex-row h-full gap-0 overflow-hidden">
      {/* ── LEFT PANEL: Form ─────────────────────────────────────────── */}
      <div className="w-full md:w-96 flex-shrink-0 border-b md:border-b-0 md:border-r border-slate-700/40 flex flex-col overflow-y-auto">
        <div className="p-6 space-y-5">
          <div>
            <h2 className="text-sm font-semibold text-slate-300 mb-1">Imagen</h2>
            <ImageDropzone
              file={imageFile}
              preview={preview}
              onFileChange={handleFileChange}
              onClear={handleClear}
              disabled={isAnalyzing}
            />
          </div>

          {/* TAG */}
          <div>
            <label className="kira-label">
              TAG del activo <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder="Ej: PUMP-001, COMP-A2"
              disabled={isAnalyzing}
              className="kira-input"
            />
          </div>

          {/* Observation */}
          <div>
            <label className="kira-label">
              Nota de observación de campo
              <span className="text-slate-600 font-normal ml-1">(opcional)</span>
            </label>
            <textarea
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              placeholder="Describí lo que observaste en campo antes del análisis..."
              disabled={isAnalyzing}
              rows={4}
              className="kira-input resize-none"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Analyze button */}
          <button
            onClick={handleAnalyze}
            disabled={!canAnalyze}
            className="kira-btn-primary w-full"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analizando con KIRA...
              </>
            ) : (
              <>
                <Camera className="w-4 h-4" />
                Analizar imagen
              </>
            )}
          </button>

          {!imageFile && (
            <p className="text-xs text-slate-600 text-center">
              Seleccioná una imagen y completá el TAG para continuar
            </p>
          )}
        </div>
      </div>

      {/* ── RIGHT PANEL: Result + History ────────────────────────────── */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-slate-700/40 px-6 pt-4 flex-shrink-0">
          {(
            [
              { key: 'resultado', label: 'Diagnóstico', icon: Camera },
              { key: 'historial', label: `Historial (${history.length})`, icon: History },
            ] as const
          ).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
                activeTab === key
                  ? 'border-sky-500 text-sky-400'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 min-h-64 overflow-y-auto p-4 md:p-6">
          {activeTab === 'resultado' ? (
            result ? (
              <DiagnosisResult result={result} observation={observation || undefined} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center gap-4">
                {isAnalyzing ? (
                  <>
                    <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center">
                      <Loader2 className="w-7 h-7 text-sky-400 animate-spin" />
                    </div>
                    <div>
                      <p className="text-slate-300 font-medium">KIRA está analizando...</p>
                      <p className="text-slate-500 text-sm mt-1">
                        Procesando imagen con visión artificial
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center">
                      <Camera className="w-7 h-7 text-slate-600" />
                    </div>
                    <div>
                      <p className="text-slate-400 font-medium">Sin diagnóstico</p>
                      <p className="text-slate-600 text-sm mt-1 max-w-xs">
                        Cargá una imagen, completá el TAG y hacé click en &quot;Analizar imagen&quot;
                      </p>
                    </div>
                  </>
                )}
              </div>
            )
          ) : (
            <AnalysisHistory
              items={history}
              onSelect={handleHistorySelect}
              activeId={activeHistoryId}
            />
          )}
        </div>
      </div>
    </div>
  )
}

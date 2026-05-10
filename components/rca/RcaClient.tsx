'use client'

import React, { useState, useRef } from 'react'
import {
  Plus, ChevronLeft, ChevronRight, Brain, Camera, X,
  Loader2, AlertCircle, Download, CheckCircle2, ChevronDown, ChevronUp,
  Save, History, PlusCircle,
} from 'lucide-react'
import IshikawaChart from './IshikawaChart'
import TimelineView  from './TimelineView'
import RcaHistory    from './RcaHistory'
import type {
  W5H2, IshikawaData, PorguesData, AnalysisResult, CategoryId, Cause, BranchPhotos,
} from './types'
import { CATEGORIES, EMPTY_ISHIKAWA, EMPTY_W5H2, EMPTY_BRANCH_PHOTOS } from './types'
import { cn } from '@/lib/utils'

// ── helpers ────────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 10)

type StepNum = 1 | 2 | 3 | 4 | 5 | 6

const STEPS = [
  { num: 1 as StepNum, label: 'Descripción del evento',   short: '5W2H'      },
  { num: 2 as StepNum, label: 'Análisis Ishikawa 6M',     short: 'Ishikawa'  },
  { num: 3 as StepNum, label: '5 Porqués por causa',      short: '5 Porqués' },
  { num: 4 as StepNum, label: 'Vista del inspector',      short: 'Inspector' },
  { num: 5 as StepNum, label: 'Análisis con IA',          short: 'Análisis'  },
  { num: 6 as StepNum, label: 'Informe final',            short: 'Informe'   },
]

const RISK_CFG = {
  'Crítico': { c: 'text-red-400',     bg: 'bg-red-500/10',    b: 'border-red-500/30'     },
  'Alto':    { c: 'text-orange-400',  bg: 'bg-orange-500/10', b: 'border-orange-500/30'  },
  'Medio':   { c: 'text-amber-400',   bg: 'bg-amber-500/10',  b: 'border-amber-500/30'   },
  'Bajo':    { c: 'text-emerald-400', bg: 'bg-emerald-500/10',b: 'border-emerald-500/30' },
} as const

// ── Step 1: 5W2H form ─────────────────────────────────────────────────────────
const W5H2_FIELDS = [
  { key: 'what',     label: '¿Qué ocurrió? *',               textarea: true  },
  { key: 'who',      label: '¿Quién estuvo involucrado? *',   textarea: false },
  { key: 'where',    label: '¿Dónde ocurrió? *',              textarea: false },
  { key: 'when',     label: '¿Cuándo ocurrió? *',             textarea: false },
  { key: 'how',      label: '¿Cómo ocurrió? *',               textarea: true  },
  { key: 'why',      label: 'Causa aparente inicial',         textarea: false },
  { key: 'how_much', label: 'Impacto / costo estimado',       textarea: false },
] as const

function Step1Form({
  w5h2, setW5h2, photoRef, onPhotos,
}: {
  w5h2: W5H2
  setW5h2: React.Dispatch<React.SetStateAction<W5H2>>
  photoRef: React.RefObject<HTMLInputElement>
  onPhotos: (e: React.ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      {W5H2_FIELDS.map((f) => (
        <div key={f.key}>
          <label className="text-[11px] text-slate-400 uppercase tracking-wider">{f.label}</label>
          {f.textarea ? (
            <textarea
              rows={3}
              value={w5h2[f.key]}
              onChange={(e) => setW5h2((p) => ({ ...p, [f.key]: e.target.value }))}
              className="mt-1 w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-sm
                         text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1
                         focus:ring-sky-500 resize-none"
            />
          ) : (
            <input
              type="text"
              value={w5h2[f.key]}
              onChange={(e) => setW5h2((p) => ({ ...p, [f.key]: e.target.value }))}
              className="mt-1 w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-sm
                         text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1
                         focus:ring-sky-500"
            />
          )}
        </div>
      ))}

      {/* Photo upload */}
      <div>
        <label className="text-[11px] text-slate-400 uppercase tracking-wider">Fotos del evento</label>
        <input ref={photoRef} type="file" accept="image/*" multiple className="hidden" onChange={onPhotos} />
        <button
          onClick={() => photoRef.current?.click()}
          className="mt-1 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl
                     border border-dashed border-slate-600 hover:border-sky-500/50
                     text-slate-500 hover:text-slate-300 text-xs transition-colors"
        >
          <Camera className="w-4 h-4" /> Agregar fotos
        </button>
        {w5h2.photos.length > 0 && (
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {w5h2.photos.map((url, i) => (
              <div key={i} className="relative">
                <img src={url} alt="" className="w-10 h-10 object-cover rounded-lg border border-slate-700" />
                <button
                  onClick={() => setW5h2((p) => ({ ...p, photos: p.photos.filter((_, j) => j !== i) }))}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center"
                >
                  <X className="w-2.5 h-2.5 text-white" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Step 2: Ishikawa cause entry ──────────────────────────────────────────────
function Step2Ishikawa({
  ishikawa, catInputs, setCatInputs, onAdd, onRemove,
}: {
  ishikawa: IshikawaData
  catInputs: Record<CategoryId, string>
  setCatInputs: React.Dispatch<React.SetStateAction<Record<CategoryId, string>>>
  onAdd: (catId: CategoryId) => void
  onRemove: (catId: CategoryId, causeId: string) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-slate-500 leading-relaxed">
        Identificá las causas potenciales en cada categoría. Presioná Enter o + para agregar.
      </p>
      {CATEGORIES.map((cat) => {
        const causes = ishikawa[cat.id] ?? []
        return (
          <div key={cat.id}
            className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-3"
            style={{ borderLeftColor: cat.color + '60', borderLeftWidth: 2 }}
          >
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-xs">{cat.icon}</span>
              <span className="text-xs font-semibold text-slate-300">{cat.label}</span>
              {causes.length > 0 && (
                <span
                  className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full"
                  style={{ backgroundColor: cat.color + '20', color: cat.color }}
                >
                  {causes.length}
                </span>
              )}
            </div>

            {causes.map((c) => (
              <div key={c.id} className="flex items-center gap-1.5 py-0.5 group">
                <span className="text-[10px] text-slate-600">▸</span>
                <span className="text-xs text-slate-400 flex-1 leading-tight">{c.texto}</span>
                <button
                  onClick={() => onRemove(cat.id, c.id)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-600 hover:text-red-400 transition-all"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}

            <div className="flex gap-1.5 mt-2">
              <input
                value={catInputs[cat.id]}
                onChange={(e) => setCatInputs((p) => ({ ...p, [cat.id]: e.target.value }))}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onAdd(cat.id) } }}
                placeholder="Agregar causa..."
                className="flex-1 rounded-lg bg-slate-800 border border-slate-700/70 px-2 py-1 text-xs
                           text-slate-200 placeholder:text-slate-700 focus:outline-none
                           focus:ring-1 focus:ring-sky-500/40"
              />
              <button
                onClick={() => onAdd(cat.id)}
                disabled={!catInputs[cat.id]?.trim()}
                className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-30
                           text-slate-300 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Step 3: 5 Porqués ─────────────────────────────────────────────────────────
function Step3Porgues({
  allCauses, porgues, expandedCause, setExpandedCause, onSetPorque,
}: {
  allCauses: Array<{ id: string; texto: string; catLabel: string; catColor: string }>
  porgues: PorguesData
  expandedCause: string | null
  setExpandedCause: (id: string | null) => void
  onSetPorque: (causeId: string, idx: number, val: string) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-slate-500 leading-relaxed">
        Seleccioná cada causa para aplicar los 5 Porqués. Todos los campos son opcionales.
      </p>
      {allCauses.map((cause) => {
        const isOpen = expandedCause === cause.id
        const whys   = porgues[cause.id] ?? ['', '', '', '', '']
        const filled = whys.filter(Boolean).length

        return (
          <div key={cause.id} className="rounded-xl border border-slate-700/50 overflow-hidden">
            <button
              className="w-full flex items-center gap-2 p-3 text-left hover:bg-slate-800/30 transition-colors"
              onClick={() => setExpandedCause(isOpen ? null : cause.id)}
            >
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase mb-0.5" style={{ color: cause.catColor }}>
                  {cause.catLabel}
                </p>
                <p className="text-xs text-slate-300 truncate">{cause.texto}</p>
              </div>
              {filled > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-sky-500/10 text-sky-400
                                 border border-sky-500/20 shrink-0">
                  {filled}/5
                </span>
              )}
              {isOpen
                ? <ChevronUp className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                : <ChevronDown className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              }
            </button>

            {isOpen && (
              <div className="px-3 pb-3 space-y-2 border-t border-slate-700/40 pt-2.5 bg-slate-800/20">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i}>
                    <label className="text-[10px] text-slate-500 uppercase tracking-wider">
                      ¿Por qué {i + 1}?
                    </label>
                    <input
                      value={whys[i] ?? ''}
                      onChange={(e) => onSetPorque(cause.id, i, e.target.value)}
                      placeholder={i === 0
                        ? '¿Por qué ocurrió esto?'
                        : '¿Por qué ocurrió lo anterior?'
                      }
                      className="mt-0.5 w-full rounded-lg bg-slate-800 border border-slate-700/60 px-2 py-1.5
                                 text-xs text-slate-200 placeholder:text-slate-700
                                 focus:outline-none focus:ring-1 focus:ring-sky-500/40"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function RcaClient({ userName }: { userName: string }) {
  const [view, setView]             = useState<'new' | 'history'>('new')
  const [step, setStep]             = useState<StepNum>(1)
  const [w5h2, setW5h2]             = useState<W5H2>(EMPTY_W5H2)
  const [ishikawa, setIshikawa]     = useState<IshikawaData>(EMPTY_ISHIKAWA)
  const [branchPhotos, setBranchPhotos] = useState<BranchPhotos>(EMPTY_BRANCH_PHOTOS)
  const [porgues, setPorgues]       = useState<PorguesData>({})
  const [inspectorNotes, setNotes]  = useState('')
  const [analysis, setAnalysis]     = useState<AnalysisResult | null>(null)
  const [analyzing, setAnalyzing]   = useState(false)
  const [analyzeError, setAnaErr]   = useState('')
  const [saving, setSaving]         = useState(false)
  const [saved, setSaved]           = useState(false)
  const [saveError, setSaveError]   = useState('')

  const [catInputs, setCatInputs] = useState<Record<CategoryId, string>>(
    Object.fromEntries(CATEGORIES.map((c) => [c.id, ''])) as Record<CategoryId, string>
  )
  const [expandedCause, setExpandedCause] = useState<string | null>(null)

  const photoRef = useRef<HTMLInputElement>(null)

  // ── Derived ─────────────────────────────────────────────────────────────────
  const allCauses = CATEGORIES.flatMap((cat) =>
    (ishikawa[cat.id] ?? []).map((c) => ({
      ...c,
      catLabel: cat.label,
      catColor: cat.color,
      catId: cat.id as CategoryId,
    }))
  )
  const totalCauses = allCauses.length

  // ── Validation ───────────────────────────────────────────────────────────────
  function canAdvance() {
    if (step === 1) {
      return !!(w5h2.what.trim() && w5h2.who.trim() && w5h2.where.trim() && w5h2.when.trim() && w5h2.how.trim())
    }
    if (step === 2) return totalCauses > 0
    return true
  }

  // ── Handlers ─────────────────────────────────────────────────────────────────
  async function handlePhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    const readers = files.map(
      (f) => new Promise<string>((res) => {
        const r = new FileReader()
        r.onload = () => res(r.result as string)
        r.readAsDataURL(f)
      })
    )
    const urls = await Promise.all(readers)
    setW5h2((p) => ({ ...p, photos: [...p.photos, ...urls] }))
    if (photoRef.current) photoRef.current.value = ''
  }

  function addCause(catId: CategoryId) {
    const texto = catInputs[catId]?.trim()
    if (!texto) return
    const cause: Cause = { id: uid(), texto }
    setIshikawa((p) => ({ ...p, [catId]: [...p[catId], cause] }))
    setCatInputs((p) => ({ ...p, [catId]: '' }))
  }

  function removeCause(catId: CategoryId, causeId: string) {
    setIshikawa((p) => ({ ...p, [catId]: p[catId].filter((c) => c.id !== causeId) }))
    setPorgues((p) => { const n = { ...p }; delete n[causeId]; return n })
  }

  function onSetPorque(causeId: string, idx: number, val: string) {
    setPorgues((p) => {
      const arr = [...(p[causeId] ?? ['', '', '', '', ''])]
      arr[idx] = val
      return { ...p, [causeId]: arr }
    })
  }

  async function handleSave() {
    if (!analysis) return
    setSaving(true)
    setSaveError('')
    try {
      const res = await fetch('/api/rca', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ w5h2, ishikawa, porgues, inspectorNotes, analysis }),
      })
      if (!res.ok) throw new Error('Error al guardar')
      setSaved(true)
    } catch {
      setSaveError('No se pudo guardar. Intentá de nuevo.')
    }
    setSaving(false)
  }

  async function handleAnalyze() {
    setAnalyzing(true)
    setAnaErr('')
    try {
      const res = await fetch('/api/rca/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ w5h2, ishikawa, porgues, inspectorNotes }),
      })
      if (!res.ok) throw new Error('API error')
      const data: AnalysisResult = await res.json()
      setAnalysis(data)
      setStep(6)
    } catch {
      setAnaErr('Error al procesar el análisis. Verificá la conexión con la API de IA.')
    }
    setAnalyzing(false)
  }

  function handlePrint() {
    if (!analysis) return
    const win = window.open('', '_blank', 'width=960,height=750')
    if (!win) return
    win.document.write(buildReportHtml({ w5h2, ishikawa, porgues, inspectorNotes, analysis, userName }))
    win.document.close()
    setTimeout(() => win.print(), 600)
  }

  // ── Risk badge ───────────────────────────────────────────────────────────────
  const riskCfg = analysis
    ? (RISK_CFG[analysis.nivelRiesgoResidual] ?? RISK_CFG['Medio'])
    : null

  // ── Render ───────────────────────────────────────────────────────────────────

  // History view
  if (view === 'history') {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        {/* Tab bar */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-slate-800 shrink-0">
          <button
            onClick={() => setView('new')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-400
                       hover:text-slate-200 hover:bg-slate-800 text-xs transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" /> Nuevo análisis
          </button>
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 text-xs"
          >
            <History className="w-3.5 h-3.5" /> Historial
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          <RcaHistory />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Tab bar */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-slate-800 shrink-0">
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 text-xs"
        >
          <PlusCircle className="w-3.5 h-3.5" /> Nuevo análisis
        </button>
        <button
          onClick={() => setView('history')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-400
                     hover:text-slate-200 hover:bg-slate-800 text-xs transition-colors"
        >
          <History className="w-3.5 h-3.5" /> Historial
        </button>
      </div>

    <div className="flex flex-col md:flex-row flex-1 overflow-hidden">

      {/* ━━━ LEFT PANEL (70%) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="flex flex-col w-full md:flex-[7] border-r-0 md:border-r border-b md:border-b-0 border-slate-800/80">

        {/* LEFT TOP: Ishikawa + info */}
        <div
          className={cn('overflow-auto p-3 flex flex-col gap-2', analysis && 'border-b border-slate-800')}
          style={{ height: analysis ? '62%' : '100%' }}
        >
          {/* 5W2H chips */}
          {w5h2.what && (
            <div className="flex flex-wrap gap-1.5">
              {([
                { label: 'Qué',    val: w5h2.what  },
                { label: 'Quién',  val: w5h2.who   },
                { label: 'Dónde',  val: w5h2.where },
                { label: 'Cuándo', val: w5h2.when  },
              ] as const).filter((f) => f.val).map((f) => (
                <span key={f.label}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700/60 text-slate-400">
                  <span className="text-slate-600">{f.label}: </span>
                  {f.val.length > 35 ? f.val.slice(0, 33) + '…' : f.val}
                </span>
              ))}
            </div>
          )}

          {/* Photo miniatures */}
          {w5h2.photos.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto">
              {w5h2.photos.map((url, i) => (
                <img key={i} src={url} alt={`Foto ${i + 1}`}
                  className="w-12 h-12 object-cover rounded-xl border border-slate-700 shrink-0" />
              ))}
            </div>
          )}

          {/* Ishikawa SVG */}
          <div className="flex-1 min-h-[160px] md:min-h-[220px]">
            <IshikawaChart
              event={w5h2.what}
              ishikawa={ishikawa}
              w5h2={w5h2}
              branchPhotos={branchPhotos}
              onBranchPhotosChange={(id, photos) =>
                setBranchPhotos((prev) => ({ ...prev, [id]: photos }))
              }
            />
          </div>

          {/* Timeline */}
          {analysis?.lineaTiempo?.length > 0 && (
            <div className="border-t border-slate-800 pt-1">
              <TimelineView events={analysis.lineaTiempo} />
            </div>
          )}
        </div>

        {/* LEFT BOTTOM: AI Analysis result */}
        {analysis && (
          <div className="overflow-auto p-4 space-y-3" style={{ height: '38%' }}>
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-violet-400" />
              <h3 className="text-sm font-semibold text-slate-200">Análisis IA</h3>
              {riskCfg && (
                <span className={cn('ml-auto px-2.5 py-0.5 rounded-full text-xs font-semibold border',
                  riskCfg.bg, riskCfg.b, riskCfg.c)}>
                  Riesgo {analysis.nivelRiesgoResidual}
                </span>
              )}
            </div>

            {/* Causa raíz */}
            <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/20">
              <p className="text-[10px] font-semibold text-red-400 uppercase tracking-wider mb-1">
                Causa Raíz
              </p>
              <p className="text-xs text-slate-300">{analysis.causaRaiz}</p>
            </div>

            {/* Causas contribuyentes */}
            <div>
              <p className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider mb-1.5">
                Causas Contribuyentes
              </p>
              <ul className="space-y-1">
                {analysis.causasContribuyentes.map((c, i) => (
                  <li key={i} className="flex gap-2 text-xs text-slate-400">
                    <span className="text-amber-500 shrink-0">▸</span>{c}
                  </li>
                ))}
              </ul>
            </div>

            {/* Acciones correctivas */}
            <div>
              <p className="text-[10px] font-semibold text-sky-400 uppercase tracking-wider mb-1.5">
                Acciones Correctivas
              </p>
              <div className="space-y-1.5">
                {analysis.accionesCorrectivas.map((a, i) => (
                  <div key={i}
                    className="p-2 rounded-lg bg-slate-800/50 border border-slate-700/40">
                    <p className="text-xs text-slate-300 mb-0.5">{a.accion}</p>
                    <div className="flex gap-3 text-[10px] text-slate-500">
                      <span>👤 {a.responsable}</span>
                      <span>📅 {a.plazo}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Conclusión ejecutiva */}
            <div className="p-3 rounded-xl bg-violet-500/5 border border-violet-500/20">
              <p className="text-[10px] font-semibold text-violet-400 uppercase tracking-wider mb-1">
                Conclusión Ejecutiva
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">{analysis.conclusionEjecutiva}</p>
            </div>
          </div>
        )}
      </div>

      {/* ━━━ RIGHT PANEL (30%) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="flex flex-col w-full md:flex-[3] border-t border-slate-700/40 md:border-t-0 overflow-hidden">

        {/* RIGHT TOP (35%): Step progress */}
        <div className="flex flex-col p-3 border-b border-slate-800" style={{ height: '35%' }}>
          {/* Stepper */}
          <div className="flex items-center gap-0.5 mb-3 overflow-x-auto pb-1">
            {STEPS.map((s, i) => (
              <div key={s.num} className="flex items-center shrink-0">
                <div className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0',
                  step === s.num
                    ? 'bg-sky-600 text-white ring-2 ring-sky-400/50'
                    : step > s.num
                    ? 'bg-emerald-600/40 text-emerald-300'
                    : 'bg-slate-800 text-slate-600'
                )}>
                  {step > s.num ? '✓' : s.num}
                </div>
                {i < STEPS.length - 1 && (
                  <div className={cn('w-3 h-px mx-0.5', step > s.num ? 'bg-emerald-700' : 'bg-slate-700')} />
                )}
              </div>
            ))}
          </div>

          {/* Current step meta */}
          <div className="flex-1 overflow-auto">
            <p className="text-[10px] text-slate-600 uppercase tracking-wider">
              Paso {step} de 6
            </p>
            <h2 className="text-sm font-semibold text-slate-200 mt-0.5 leading-tight">
              {STEPS[step - 1].label}
            </h2>

            <div className="mt-2 space-y-1">
              {w5h2.what && (
                <p className="text-[10px] text-slate-500">
                  <span className="text-slate-400">Evento: </span>
                  {w5h2.what.slice(0, 55)}{w5h2.what.length > 55 ? '…' : ''}
                </p>
              )}
              {step >= 2 && (
                <p className="text-[10px] text-slate-500">
                  <span className="text-slate-400">Causas: </span>
                  {totalCauses} en Ishikawa
                </p>
              )}
              {step >= 3 && totalCauses > 0 && (
                <p className="text-[10px] text-slate-500">
                  <span className="text-slate-400">5 Porqués: </span>
                  {allCauses.filter((c) => porgues[c.id]?.some(Boolean)).length}/{totalCauses} causas
                </p>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT BOTTOM (65%): Current step form */}
        <div className="flex-1 overflow-auto p-3 flex flex-col gap-3">

          {step === 1 && (
            <Step1Form
              w5h2={w5h2}
              setW5h2={setW5h2}
              photoRef={photoRef}
              onPhotos={handlePhotos}
            />
          )}

          {step === 2 && (
            <Step2Ishikawa
              ishikawa={ishikawa}
              catInputs={catInputs}
              setCatInputs={setCatInputs}
              onAdd={addCause}
              onRemove={removeCause}
            />
          )}

          {step === 3 && (
            <Step3Porgues
              allCauses={allCauses}
              porgues={porgues}
              expandedCause={expandedCause}
              setExpandedCause={setExpandedCause}
              onSetPorque={onSetPorque}
            />
          )}

          {step === 4 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-slate-500 leading-relaxed">
                Anotá tus observaciones, hipótesis, contexto adicional o cualquier dato relevante para enriquecer el análisis.
              </p>
              <textarea
                value={inspectorNotes}
                onChange={(e) => setNotes(e.target.value)}
                rows={12}
                placeholder="Ej: El equipo presentó anomalías sonoras días antes del evento. El turno anterior reportó una vibración inusual pero no lo registró. La última lubricación fue hace 45 días según el tablero..."
                className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-sm
                           text-slate-200 placeholder:text-slate-600 focus:outline-none
                           focus:ring-1 focus:ring-sky-500 resize-none"
              />
            </div>
          )}

          {step === 5 && (
            <div className="flex flex-col items-center justify-center gap-5 py-6 text-center flex-1">
              <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20
                              flex items-center justify-center">
                <Brain className="w-7 h-7 text-violet-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-200 mb-1.5">Análisis con Claude</p>
                <p className="text-xs text-slate-500 leading-relaxed max-w-[200px] mx-auto">
                  Se procesará el contexto completo del evento, las {totalCauses} causas del Ishikawa y los insights del inspector para generar un informe RCA detallado.
                </p>
              </div>
              {analyzeError && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10
                                border border-red-500/20 text-left w-full">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-400">{analyzeError}</p>
                </div>
              )}
              <button
                onClick={handleAnalyze}
                disabled={analyzing}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-violet-600
                           hover:bg-violet-500 disabled:opacity-50 text-white text-sm
                           font-medium transition-colors"
              >
                {analyzing
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Analizando...</>
                  : <><Brain className="w-4 h-4" /> Iniciar Análisis</>
                }
              </button>
              {analyzing && (
                <p className="text-[11px] text-slate-600 animate-pulse">
                  Procesando con el modelo más avanzado de Anthropic...
                </p>
              )}
            </div>
          )}

          {step === 6 && analysis && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <p className="text-xs text-emerald-300">Análisis completado. El informe está listo.</p>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  onClick={handlePrint}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-slate-700
                             hover:bg-slate-600 text-slate-200 text-xs font-medium transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Exportar PDF
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || saved}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors',
                    saved
                      ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 cursor-default'
                      : 'bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white'
                  )}
                >
                  {saving
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Guardando...</>
                    : saved
                    ? <><CheckCircle2 className="w-3.5 h-3.5" /> Guardado</>
                    : <><Save className="w-3.5 h-3.5" /> Guardar</>
                  }
                </button>
              </div>
              {saveError && (
                <p className="text-[10px] text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" /> {saveError}
                </p>
              )}

              {/* Summary in right panel */}
              <div className="space-y-3 text-xs">
                <div>
                  <p className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider mb-1">
                    Lecciones aprendidas
                  </p>
                  <ul className="space-y-0.5">
                    {analysis.leccionesAprendidas.map((l, i) => (
                      <li key={i} className="flex gap-1.5 text-slate-400">
                        <span className="text-emerald-500 shrink-0">▸</span>{l}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider mb-1">
                    Patrones a monitorear
                  </p>
                  <ul className="space-y-0.5">
                    {analysis.patronesMonitorear.map((p, i) => (
                      <li key={i} className="flex gap-1.5 text-slate-400">
                        <span className="text-amber-500 shrink-0">▸</span>{p}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          {step !== 5 && (
            <div className="flex gap-2 mt-auto pt-2 border-t border-slate-800">
              {step > 1 && (
                <button
                  onClick={() => setStep((s) => (s - 1) as StepNum)}
                  className="flex items-center gap-1 px-2.5 py-1.5 md:px-3 md:py-2 rounded-xl border border-slate-700
                             hover:border-slate-600 text-slate-400 hover:text-slate-200 text-xs transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Atrás</span>
                </button>
              )}
              {step < 5 && (
                <button
                  onClick={() => { if (canAdvance()) setStep((s) => (s + 1) as StepNum) }}
                  disabled={!canAdvance()}
                  className="flex-1 flex items-center justify-center gap-1 md:gap-1.5 px-2.5 py-1.5 md:px-3 md:py-2 rounded-xl
                             bg-sky-600 hover:bg-sky-500 disabled:opacity-40
                             disabled:cursor-not-allowed text-white text-xs font-medium transition-colors"
                >
                  <span className="hidden sm:inline">Siguiente</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
              {step === 5 && null}
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
  )
}

// ── Report HTML for print ─────────────────────────────────────────────────────
function buildReportHtml({
  w5h2, ishikawa, porgues, inspectorNotes, analysis, userName,
}: {
  w5h2: W5H2
  ishikawa: IshikawaData
  porgues: PorguesData
  inspectorNotes: string
  analysis: AnalysisResult
  userName: string
}) {
  const date = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })

  const ishikawaRows = CATEGORIES.map((cat) => {
    const causes = ishikawa[cat.id] ?? []
    if (!causes.length) return ''
    return `
      <h4 style="margin:12px 0 4px;color:#334155;font-size:13px;">${cat.icon} ${cat.label}</h4>
      <ul style="margin:0 0 0 16px;padding:0;">
        ${causes.map((c) => {
          const whys = porgues[c.id] ?? []
          const whyItems = whys.filter(Boolean).map((w, i) =>
            `<li style="color:#64748b;font-size:12px;margin-top:2px;">Por qué ${i+1}: ${w}</li>`
          ).join('')
          return `<li style="color:#475569;font-size:13px;margin-bottom:4px;">
            ${c.texto}
            ${whyItems ? `<ul style="margin:2px 0 0 16px;">${whyItems}</ul>` : ''}
          </li>`
        }).join('')}
      </ul>`
  }).join('')

  const actionsRows = analysis.accionesCorrectivas.map((a, i) => `
    <tr style="border-bottom:1px solid #e2e8f0;">
      <td style="padding:8px;font-size:12px;color:#1e293b;">${i+1}. ${a.accion}</td>
      <td style="padding:8px;font-size:12px;color:#475569;">${a.responsable}</td>
      <td style="padding:8px;font-size:12px;color:#475569;">${a.plazo}</td>
    </tr>`).join('')

  const riskColor = {
    'Crítico': '#ef4444', 'Alto': '#f97316', 'Medio': '#f59e0b', 'Bajo': '#22c55e',
  }[analysis.nivelRiesgoResidual] ?? '#64748b'

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <title>Informe RCA — ${w5h2.what}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; color: #1e293b; margin: 0; padding: 24px 32px; font-size: 13px; }
    h1 { font-size: 20px; margin-bottom: 4px; color: #0f172a; }
    h2 { font-size: 15px; color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin-top: 24px; }
    h3 { font-size: 13px; color: #334155; margin: 8px 0 4px; }
    .badge { display:inline-block; padding:2px 10px; border-radius:99px; font-size:12px; font-weight:700; }
    .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px; }
    .field-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px 24px; margin:12px 0; }
    .field { margin-bottom:6px; }
    .field label { font-size:10px; color:#64748b; text-transform:uppercase; letter-spacing:.5px; }
    .field p { margin:2px 0 0; font-size:13px; color:#1e293b; }
    table { width:100%; border-collapse:collapse; margin-top:8px; }
    th { background:#f1f5f9; padding:8px; text-align:left; font-size:11px; color:#64748b; text-transform:uppercase; }
    .signatures { display:grid; grid-template-columns:1fr 1fr; gap:32px; margin-top:40px; }
    .sig-box { border-top:1px solid #cbd5e1; padding-top:8px; }
    .sig-box p { margin:2px 0; font-size:12px; color:#64748b; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>Informe de Análisis RCA</h1>
      <p style="color:#64748b;margin:0;font-size:12px;">KIRA — Mantenimiento Industrial · ${date}</p>
    </div>
    <span class="badge" style="background:${riskColor}22;color:${riskColor};border:1px solid ${riskColor}55;">
      Riesgo ${analysis.nivelRiesgoResidual}
    </span>
  </div>

  <h2>1. Descripción del Evento (5W2H)</h2>
  <div class="field-grid">
    <div class="field"><label>¿Qué ocurrió?</label><p>${w5h2.what}</p></div>
    <div class="field"><label>¿Quién?</label><p>${w5h2.who}</p></div>
    <div class="field"><label>¿Dónde?</label><p>${w5h2.where}</p></div>
    <div class="field"><label>¿Cuándo?</label><p>${w5h2.when}</p></div>
    <div class="field"><label>¿Cómo?</label><p>${w5h2.how}</p></div>
    ${w5h2.why      ? `<div class="field"><label>Causa aparente</label><p>${w5h2.why}</p></div>` : ''}
    ${w5h2.how_much ? `<div class="field"><label>Impacto/Costo</label><p>${w5h2.how_much}</p></div>` : ''}
  </div>

  <h2>2. Análisis Ishikawa 6M y 5 Porqués</h2>
  ${ishikawaRows || '<p style="color:#94a3b8;">Sin causas registradas.</p>'}

  ${inspectorNotes ? `
  <h2>3. Vista del Inspector</h2>
  <p style="color:#475569;line-height:1.6;">${inspectorNotes}</p>` : ''}

  <h2>${inspectorNotes ? '4' : '3'}. Resultado del Análisis IA</h2>

  <h3>Causa Raíz</h3>
  <p style="background:#fef2f2;border-left:3px solid #ef4444;padding:10px 14px;border-radius:4px;color:#7f1d1d;">
    ${analysis.causaRaiz}
  </p>

  <h3>Causas Contribuyentes</h3>
  <ul style="padding-left:18px;">
    ${analysis.causasContribuyentes.map((c) => `<li style="color:#475569;margin-bottom:4px;">${c}</li>`).join('')}
  </ul>

  <h3>Acciones Correctivas Recomendadas</h3>
  <table>
    <thead><tr><th>Acción</th><th>Responsable</th><th>Plazo</th></tr></thead>
    <tbody>${actionsRows}</tbody>
  </table>

  <h3>Lecciones Aprendidas</h3>
  <ul style="padding-left:18px;">
    ${analysis.leccionesAprendidas.map((l) => `<li style="color:#475569;margin-bottom:4px;">${l}</li>`).join('')}
  </ul>

  <h3>Patrones a Monitorear</h3>
  <ul style="padding-left:18px;">
    ${analysis.patronesMonitorear.map((p) => `<li style="color:#475569;margin-bottom:4px;">${p}</li>`).join('')}
  </ul>

  <h3>Conclusión Ejecutiva</h3>
  <p style="background:#f8fafc;border:1px solid #e2e8f0;padding:12px 16px;border-radius:6px;
            line-height:1.7;color:#334155;">
    ${analysis.conclusionEjecutiva}
  </p>

  <div class="signatures">
    <div class="sig-box">
      <p style="font-weight:600;color:#1e293b;">${userName}</p>
      <p>Inspector / Responsable del análisis</p>
    </div>
    <div class="sig-box">
      <p style="font-weight:600;color:#1e293b;">___________________________</p>
      <p>Jefe de Área / Supervisor</p>
    </div>
  </div>
</body>
</html>`
}

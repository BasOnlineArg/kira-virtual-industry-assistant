'use client'

import { useState, useRef } from 'react'
import { Save, History, Library, FileSearch, Upload, X, FileText, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import InspectionHistory, { type InspectionRow } from './InspectionHistory'
import RiskMatrix        from './RiskMatrix'
import NdtFrmPanel       from './NdtFrmPanel'
import FieldPhotos       from './FieldPhotos'
import ReportsLibrary    from './ReportsLibrary'
import { SECTORS }       from '@/lib/structural/templates'
import { INSPECTION_TYPES, CONDITION_STATES } from '@/lib/structural/constants'

interface Report {
  id: string; nombre: string; tipo: 'pdf' | 'imagen'
  url: string; asset_tag: string | null; descripcion: string | null; fecha: string
}

interface Props {
  initialHistory: InspectionRow[]
  initialReports: Report[]
}

type RightTab = 'history' | 'library'

const RIGHT_TABS: { id: RightTab; label: string; icon: React.ElementType }[] = [
  { id: 'history', label: 'Historial',  icon: History  },
  { id: 'library', label: 'Biblioteca', icon: Library  },
]

export default function StructuralClient({ initialHistory, initialReports }: Props) {

  // ── Identification ──────────────────────────────────────────────────────────
  const [tag, setTag]                       = useState('')
  const [sector, setSector]                 = useState('')
  const [tipoInspeccion, setTipoInspeccion] = useState('')
  const [estadoGlobal, setEstadoGlobal]     = useState('')
  const [otSap, setOtSap]                   = useState('')

  // ── Risk matrix ─────────────────────────────────────────────────────────────
  const [criticidad, setCriticidad] = useState(0)
  const [frecuencia, setFrecuencia] = useState(0)
  const [impacto, setImpacto]       = useState(0)

  // ── NDT + FRM ───────────────────────────────────────────────────────────────
  const [selectedNdt, setSelectedNdt] = useState<string[]>([])
  const [selectedFrm, setSelectedFrm] = useState<string[]>([])

  // ── Photos ──────────────────────────────────────────────────────────────────
  const [photos, setPhotos] = useState<string[]>([])

  // ── Checklist PDF ───────────────────────────────────────────────────────────
  const [checklistPdfUrl, setChecklistPdfUrl] = useState<string | null>(null)
  const [checklistPdfName, setChecklistPdfName] = useState<string | null>(null)
  const [uploadingPdf, setUploadingPdf]       = useState(false)
  const pdfInputRef = useRef<HTMLInputElement>(null)

  // ── Diagnosis ───────────────────────────────────────────────────────────────
  const [diagnostico, setDiagnostico]       = useState('')
  const [recomendaciones, setRecomendaciones] = useState('')
  const [findings, setFindings]             = useState('')
  const [observaciones, setObs]             = useState('')

  // ── Async ───────────────────────────────────────────────────────────────────
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [saveError, setSaveError] = useState('')
  const [history, setHistory]   = useState<InspectionRow[]>(initialHistory)
  const [reports, setReports]   = useState<Report[]>(initialReports)
  const [rightTab, setRightTab] = useState<RightTab>('history')

  const canSave = !!tag.trim() && !!sector && !saving

  // ── Upload checklist PDF to Supabase Storage ────────────────────────────────
  async function handlePdfUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingPdf(true)
    try {
      const supabase = createClient()
      const path     = `checklists/${Date.now()}_${tag.replace(/[^a-z0-9]/gi, '_')}_${file.name}`
      const { error } = await supabase.storage
        .from('inspection-photos')
        .upload(path, file, { contentType: 'application/pdf', upsert: false })

      if (!error) {
        const { data } = supabase.storage.from('inspection-photos').getPublicUrl(path)
        setChecklistPdfUrl(data.publicUrl)
        setChecklistPdfName(file.name)
      }
    } catch (err) {
      console.error('[PDF upload]', err)
    }
    setUploadingPdf(false)
    if (pdfInputRef.current) pdfInputRef.current.value = ''
  }

  function removePdf() {
    setChecklistPdfUrl(null)
    setChecklistPdfName(null)
  }

  // ── Save inspection ─────────────────────────────────────────────────────────
  async function handleSave() {
    if (!canSave) return
    setSaving(true)
    setSaveError('')
    setSaved(false)

    try {
      const res = await fetch('/api/structural/save', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tag: tag.trim(), sector, tipoInspeccion, estadoGlobal,
          otSap: otSap.trim() || undefined,
          criticidad, frecuencia, impacto,
          findings: findings.trim() || undefined,
          observaciones: observaciones.trim() || undefined,
          herramientasNdt: selectedNdt,
          frmRisks:        selectedFrm,
          photos,
          checklistPdfUrl: checklistPdfUrl || undefined,
          diagnostico:     diagnostico.trim(),
          recomendaciones: recomendaciones.trim() || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al guardar')

      // Add to history
      setHistory((prev) => [{
        id:              data.id,
        asset_tag:       data.tag,
        sector:          data.sector,
        tipo_estructura: data.tipoInspeccion ?? '',
        score_pct:       null,
        estado:          data.estado,
        ot_sap:          data.otSap ?? null,
        falla_prob:      null,
        diagnostico:     data.diagnostico,
        fecha:           data.fecha,
        inspector_id:    '',
      }, ...prev])

      setSaved(true)
      // Reset form
      setTag(''); setSector(''); setTipoInspeccion(''); setEstadoGlobal(''); setOtSap('')
      setCriticidad(0); setFrecuencia(0); setImpacto(0)
      setSelectedNdt([]); setSelectedFrm([]); setPhotos([])
      setChecklistPdfUrl(null); setChecklistPdfName(null)
      setDiagnostico(''); setRecomendaciones(''); setFindings(''); setObs('')
      setRightTab('history')
      setTimeout(() => setSaved(false), 3000)
    } catch (e: any) {
      setSaveError(e.message ?? 'Error desconocido')
    }
    setSaving(false)
  }

  return (
    <div className="flex flex-col md:flex-row gap-6 h-full">

      {/* ── LEFT PANEL ── */}
      <div className="w-full md:w-80 xl:w-96 flex-shrink-0 space-y-4 overflow-y-auto pb-4">

        {/* Identification */}
        <div className="bg-slate-800/40 border border-slate-700/30 rounded-2xl p-4 space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Identificación</p>

          <div>
            <label className="kira-label">TAG del activo *</label>
            <input type="text" placeholder="Ej: EST-001, TQ-07A"
              value={tag} onChange={(e) => setTag(e.target.value)}
              disabled={saving} className="kira-input mt-1" />
          </div>

          <div>
            <label className="kira-label">OT SAP (8 dígitos)</label>
            <input type="text" placeholder="12345678" maxLength={8}
              value={otSap}
              onChange={(e) => setOtSap(e.target.value.replace(/\D/g, '').slice(0, 8))}
              disabled={saving} className="kira-input mt-1 font-mono" />
          </div>
        </div>

        {/* Inspection type */}
        <div className="bg-slate-800/40 border border-slate-700/30 rounded-2xl p-4 space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tipo de inspección</p>
          <div className="flex flex-wrap gap-1.5">
            {INSPECTION_TYPES.map((t) => (
              <button key={t} onClick={() => setTipoInspeccion(tipoInspeccion === t ? '' : t)}
                disabled={saving}
                className={cn(
                  'px-2.5 py-1.5 rounded-lg border text-xs transition-colors',
                  tipoInspeccion === t
                    ? 'border-violet-500/50 bg-violet-500/10 text-violet-300 font-medium'
                    : 'border-slate-700/50 bg-slate-900/30 text-slate-400 hover:text-slate-200',
                )}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Global condition */}
        <div className="bg-slate-800/40 border border-slate-700/30 rounded-2xl p-4 space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado global del activo</p>
          <div className="grid grid-cols-2 gap-1.5">
            {CONDITION_STATES.map((s) => (
              <button key={s.value} onClick={() => setEstadoGlobal(estadoGlobal === s.value ? '' : s.value)}
                disabled={saving}
                className={cn(
                  'px-2.5 py-2 rounded-lg border text-xs font-medium transition-colors',
                  estadoGlobal === s.value
                    ? cn(s.bg, s.color)
                    : 'border-slate-700/50 bg-slate-900/30 text-slate-400 hover:text-slate-200',
                )}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sector */}
        <div className="bg-slate-800/40 border border-slate-700/30 rounded-2xl p-4 space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sector</p>
          <div className="grid grid-cols-1 gap-1">
            {SECTORS.map((s) => (
              <button key={s} onClick={() => setSector(s)} disabled={saving}
                className={cn('text-left px-3 py-2 rounded-lg border text-xs transition-colors',
                  sector === s
                    ? 'border-sky-500/50 bg-sky-500/10 text-sky-300 font-medium'
                    : 'border-slate-700/50 bg-slate-900/30 text-slate-400 hover:text-slate-200',
                )}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Risk Matrix */}
        <div className="bg-slate-800/40 border border-slate-700/30 rounded-2xl p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Matriz de riesgo</p>
          <RiskMatrix
            criticidad={criticidad} frecuencia={frecuencia} impacto={impacto}
            onCriticidad={setCriticidad} onFrecuencia={setFrecuencia} onImpacto={setImpacto}
            disabled={saving}
          />
        </div>

        {/* NDT + FRM */}
        <div className="bg-slate-800/40 border border-slate-700/30 rounded-2xl p-4">
          <NdtFrmPanel
            selectedNdt={selectedNdt} selectedFrm={selectedFrm}
            onNdtChange={setSelectedNdt} onFrmChange={setSelectedFrm}
            disabled={saving}
          />
        </div>

        {/* Field Photos */}
        <div className="bg-slate-800/40 border border-slate-700/30 rounded-2xl p-4">
          <FieldPhotos photos={photos} onChange={setPhotos} disabled={saving} />
        </div>

        {/* Checklist PDF upload */}
        <div className="bg-slate-800/40 border border-slate-700/30 rounded-2xl p-4 space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Checklist físico (PDF escaneado)
          </p>

          {checklistPdfUrl ? (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-3 py-2">
              <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
              <a href={checklistPdfUrl} target="_blank" rel="noopener noreferrer"
                 className="flex-1 text-xs text-emerald-400 hover:underline truncate">
                {checklistPdfName ?? 'checklist.pdf'}
              </a>
              <button onClick={removePdf} className="shrink-0 text-slate-500 hover:text-red-400 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <>
              <input ref={pdfInputRef} type="file" accept=".pdf" className="hidden" onChange={handlePdfUpload} />
              <button
                onClick={() => pdfInputRef.current?.click()}
                disabled={uploadingPdf || saving}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed
                           border-slate-600 text-slate-400 hover:text-slate-200 hover:border-slate-500
                           text-xs transition-colors disabled:opacity-50"
              >
                {uploadingPdf
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Subiendo PDF...</>
                  : <><Upload className="w-3.5 h-3.5" />Adjuntar PDF del checklist</>
                }
              </button>
            </>
          )}
        </div>

        {/* Findings */}
        <div className="bg-slate-800/40 border border-slate-700/30 rounded-2xl p-4">
          <label className="kira-label">Hallazgos de campo</label>
          <textarea rows={3} placeholder="Describí hallazgos específicos: corrosión, fisuras, deformaciones…"
            value={findings} onChange={(e) => setFindings(e.target.value)}
            disabled={saving} className="kira-input mt-1 resize-none w-full" />
        </div>

        {/* Inspector diagnosis */}
        <div className="bg-slate-800/40 border border-slate-700/30 rounded-2xl p-4 space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Diagnóstico del inspector</p>
          <textarea rows={4}
            placeholder="Diagnóstico técnico basado en la inspección realizada…"
            value={diagnostico} onChange={(e) => setDiagnostico(e.target.value)}
            disabled={saving} className="kira-input resize-none w-full" />
          <textarea rows={3}
            placeholder="Recomendaciones y acciones a seguir…"
            value={recomendaciones} onChange={(e) => setRecomendaciones(e.target.value)}
            disabled={saving} className="kira-input resize-none w-full" />
        </div>

        {/* Observations */}
        <div className="bg-slate-800/40 border border-slate-700/30 rounded-2xl p-4">
          <label className="kira-label">Observaciones generales</label>
          <textarea rows={2} placeholder="Condiciones climáticas, contexto de la inspección…"
            value={observaciones} onChange={(e) => setObs(e.target.value)}
            disabled={saving} className="kira-input mt-1 resize-none w-full" />
        </div>

        {/* Save */}
        {saveError && (
          <p className="text-xs text-red-400 px-1">{saveError}</p>
        )}
        <button
          onClick={handleSave}
          disabled={!canSave}
          className={cn(
            'w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors',
            saved
              ? 'bg-emerald-600 text-white'
              : 'bg-sky-600 hover:bg-sky-500 text-white disabled:opacity-40 disabled:cursor-not-allowed',
          )}
        >
          {saving
            ? <><Loader2 className="w-4 h-4 animate-spin" />Guardando…</>
            : saved
            ? <><FileSearch className="w-4 h-4" />¡Inspección guardada!</>
            : <><Save className="w-4 h-4" />Guardar inspección</>
          }
        </button>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex gap-1 mb-4 bg-slate-800/40 border border-slate-700/30 rounded-xl p-1 shrink-0 w-full md:w-fit overflow-x-auto">
          {RIGHT_TABS.map((t) => (
            <button key={t.id} onClick={() => setRightTab(t.id)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap flex-1 md:flex-none justify-center',
                rightTab === t.id ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50',
              )}>
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 min-h-64 bg-slate-800/40 border border-slate-700/30 rounded-2xl p-4 overflow-x-auto overflow-y-auto">
          {rightTab === 'history' && (
            <InspectionHistory rows={history} onSelect={() => {}} />
          )}
          {rightTab === 'library' && (
            <ReportsLibrary
              reports={reports}
              onUpload={(r) => setReports((prev) => [r, ...prev])}
              onDelete={(id) => setReports((prev) => prev.filter((r) => r.id !== id))}
            />
          )}
        </div>
      </div>
    </div>
  )
}

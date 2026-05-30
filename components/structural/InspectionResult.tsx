'use client'

import { useState } from 'react'
import {
  CheckCircle, AlertTriangle, XCircle, FileText, Loader2,
  Clock, Wrench, ZoomIn, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { riskLevel, NDT_TOOLS, FRM_RISKS } from '@/lib/structural/constants'
import type { ChecklistCategory } from '@/lib/structural/templates'

export interface StructuralResult {
  id: string | null
  tag: string
  sector: string
  tipoEstructura: string
  tipoInspeccion?: string
  estadoGlobal?: string
  otSap?: string
  scorePct: number
  estado: 'aprobada' | 'observada' | 'rechazada'
  criticidad?: number
  frecuencia?: number
  impacto?: number
  risk_score?: number
  risk_label?: string
  herramientasNdt?: string[]
  frmRisks?: string[]
  photos?: string[]
  findings?: string
  diagnostico: string
  probabilidad_falla: number | null
  recomendaciones: string | null
  fecha: string
  inspector_name: string
  categories?: ChecklistCategory[]
}

const ESTADO_CONFIG = {
  aprobada:  { icon: CheckCircle,   color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', label: 'APROBADA' },
  observada: { icon: AlertTriangle, color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/30',   label: 'OBSERVADA' },
  rechazada: { icon: XCircle,       color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/30',       label: 'RECHAZADA' },
}

function ScoreArc({ score }: { score: number }) {
  const r = 44
  const circumference = Math.PI * r
  const offset = circumference * (1 - score / 100)
  const color = score >= 70 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444'

  return (
    <div className="flex flex-col items-center">
      <svg width="112" height="68" viewBox="0 0 112 68">
        <path d="M 12 56 A 44 44 0 0 1 100 56"
          fill="none" stroke="#1e293b" strokeWidth="10" strokeLinecap="round" />
        <path d="M 12 56 A 44 44 0 0 1 100 56"
          fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={`${circumference}`} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
        <text x="56" y="52" textAnchor="middle" fill={color} fontSize="22" fontWeight="bold" fontFamily="monospace">
          {score}
        </text>
        <text x="56" y="64" textAnchor="middle" fill="#64748b" fontSize="9">/ 100</text>
      </svg>
    </div>
  )
}

async function exportDocx(result: StructuralResult) {
  const { Document, Paragraph, TextRun, HeadingLevel, Packer } = await import('docx')

  const ndtLabels = (result.herramientasNdt ?? []).map((id) =>
    NDT_TOOLS.find((t) => t.id === id)?.label ?? id
  )
  const frmLabels = (result.frmRisks ?? []).map((id) =>
    FRM_RISKS.find((r) => r.id === id)?.label ?? id
  )

  const checklistParas = result.categories?.flatMap((cat) => [
    new Paragraph({ text: cat.categoria, heading: HeadingLevel.HEADING_3 }),
    ...cat.items
      .filter((i) => i.score > 0)
      .map((i) => new Paragraph({
        children: [new TextRun({
          text: `• ${i.item}: ${i.score}/5${i.observacion ? ' — ' + i.observacion : ''}`,
        })],
      })),
  ]) ?? []

  const riskParas = (result.criticidad && result.frecuencia && result.impacto) ? [
    new Paragraph({ text: 'MATRIZ DE RIESGO', heading: HeadingLevel.HEADING_2 }),
    new Paragraph({ children: [new TextRun({ text: `Criticidad: ${result.criticidad}/5 | Frecuencia: ${result.frecuencia}/5 | Impacto: ${result.impacto}/5` })] }),
    new Paragraph({ children: [new TextRun({ text: `Score de riesgo: ${result.risk_score}/125 — Nivel: ${result.risk_label?.toUpperCase()}`, bold: true })] }),
    new Paragraph({ text: '' }),
  ] : []

  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({ text: `FRM Estructural — ${result.tag}`, heading: HeadingLevel.HEADING_1 }),
        new Paragraph({ text: `Fecha: ${new Date(result.fecha).toLocaleString('es-AR')}` }),
        new Paragraph({ text: `Inspector: ${result.inspector_name}` }),
        new Paragraph({ text: `Sector: ${result.sector}` }),
        new Paragraph({ text: `Tipo de estructura: ${result.tipoEstructura}` }),
        new Paragraph({ text: `Tipo de inspección: ${result.tipoInspeccion || 'No especificado'}` }),
        new Paragraph({ text: `Estado global del activo: ${result.estadoGlobal || 'No especificado'}` }),
        new Paragraph({ text: `OT SAP: ${result.otSap || 'No asignada'}` }),
        new Paragraph({ text: '' }),
        new Paragraph({ text: 'RESULTADO GLOBAL', heading: HeadingLevel.HEADING_2 }),
        new Paragraph({ children: [new TextRun({ text: `Score FRM: ${result.scorePct}%`, bold: true })] }),
        new Paragraph({ children: [new TextRun({ text: `Estado: ${result.estado.toUpperCase()}`, bold: true })] }),
        new Paragraph({ text: '' }),
        ...riskParas,
        ...(ndtLabels.length > 0 ? [
          new Paragraph({ text: 'HERRAMIENTAS NDT APLICADAS', heading: HeadingLevel.HEADING_2 }),
          new Paragraph({ text: ndtLabels.join(', ') }),
          new Paragraph({ text: '' }),
        ] : []),
        ...(frmLabels.length > 0 ? [
          new Paragraph({ text: 'PROTOCOLOS FRM — RIESGO FATAL', heading: HeadingLevel.HEADING_2 }),
          ...frmLabels.map((l) => new Paragraph({ text: `• ${l}` })),
          new Paragraph({ text: '' }),
        ] : []),
        ...(result.findings ? [
          new Paragraph({ text: 'HALLAZGOS DE CAMPO', heading: HeadingLevel.HEADING_2 }),
          new Paragraph({ text: result.findings }),
          new Paragraph({ text: '' }),
        ] : []),
        new Paragraph({ text: 'DIAGNÓSTICO KIRA', heading: HeadingLevel.HEADING_2 }),
        new Paragraph({ text: result.diagnostico }),
        new Paragraph({ text: '' }),
        new Paragraph({ text: 'PROBABILIDAD DE FALLA', heading: HeadingLevel.HEADING_2 }),
        new Paragraph({ text: `${result.probabilidad_falla ?? 'N/D'}%` }),
        new Paragraph({ text: '' }),
        new Paragraph({ text: 'RECOMENDACIONES', heading: HeadingLevel.HEADING_2 }),
        new Paragraph({ text: result.recomendaciones ?? 'N/D' }),
        new Paragraph({ text: '' }),
        new Paragraph({ text: 'FORMULARIO DE RELEVAMIENTO (FRM)', heading: HeadingLevel.HEADING_2 }),
        ...checklistParas,
        new Paragraph({ text: '' }),
        new Paragraph({ text: 'Generado por KIRA — Asistente Virtual Industrial' }),
        new Paragraph({ text: 'Normas: CIRSOC 101/102 · ISO 13822 · Ley 19587' }),
      ],
    }],
  })

  const blob = await Packer.toBlob(doc)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `frm_${result.tag}_${new Date(result.fecha).toISOString().slice(0, 10)}.docx`
  a.click()
  URL.revokeObjectURL(url)
}

export default function InspectionResult({ result }: { result: StructuralResult }) {
  const [exporting, setExporting]     = useState(false)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  const estadoCfg = ESTADO_CONFIG[result.estado]
  const EstadoIcon = estadoCfg.icon

  const riskScore  = result.risk_score ?? 0
  const riskLvl    = riskLevel(riskScore)

  const ndtLabels  = (result.herramientasNdt ?? []).map((id) =>
    NDT_TOOLS.find((t) => t.id === id)?.label ?? id
  )
  const frmLabels  = (result.frmRisks ?? []).map((id) =>
    FRM_RISKS.find((r) => r.id === id) ?? { label: id, icon: '⚠️' }
  )

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Diagnóstico KIRA — FRM</p>
          <p className="text-base font-semibold text-slate-100 mt-0.5">{result.tag}</p>
          <p className="text-xs text-slate-500">
            {new Date(result.fecha).toLocaleString('es-AR')} · {result.inspector_name}
          </p>
          <p className="text-xs text-slate-600 mt-0.5">
            {result.sector} · {result.tipoEstructura}
            {result.tipoInspeccion ? ` · ${result.tipoInspeccion}` : ''}
          </p>
        </div>
        <button
          onClick={async () => { setExporting(true); try { await exportDocx(result) } finally { setExporting(false) } }}
          disabled={exporting}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-sky-700 border border-sky-600
                     text-white rounded-lg hover:bg-sky-600 transition-colors disabled:opacity-50 flex-shrink-0"
        >
          {exporting
            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Exportando…</>
            : <><FileText className="w-3.5 h-3.5" />Informe DOCX</>
          }
        </button>
      </div>

      {/* Score + Estado */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-800/60 border border-slate-700/40 rounded-xl p-4 flex flex-col items-center justify-center">
          <ScoreArc score={result.scorePct} />
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">Score FRM</p>
        </div>
        <div className={cn('rounded-xl p-4 border flex flex-col items-center justify-center gap-2', estadoCfg.bg)}>
          <EstadoIcon className={cn('w-8 h-8', estadoCfg.color)} />
          <p className={cn('text-lg font-bold', estadoCfg.color)}>{estadoCfg.label}</p>
          {result.estadoGlobal && (
            <p className="text-[10px] text-slate-400 capitalize">{result.estadoGlobal}</p>
          )}
          {result.otSap && (
            <p className="text-[10px] text-slate-500 font-mono">OT: {result.otSap}</p>
          )}
        </div>
      </div>

      {/* Risk matrix result */}
      {riskScore > 0 && (
        <div className={cn('flex items-center justify-between p-3 rounded-xl border', riskLvl.bg)}>
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Riesgo C×F×I</p>
            <p className="text-[10px] text-slate-600">
              {result.criticidad} × {result.frecuencia} × {result.impacto}
            </p>
          </div>
          <div className="text-right">
            <p className={cn('text-2xl font-mono font-bold', riskLvl.textColor)}>{riskScore}</p>
            <p className={cn('text-[10px] font-semibold uppercase', riskLvl.textColor)}>{riskLvl.label}</p>
            <p className="text-[10px] text-slate-600">/ 125</p>
          </div>
        </div>
      )}

      {/* Prob falla + next inspection */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-800/60 border border-slate-700/40 rounded-xl p-3 text-center">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Prob. falla</p>
          <p className={cn('text-2xl font-mono font-bold mt-1', {
            'text-emerald-400': (result.probabilidad_falla ?? 0) < 30,
            'text-amber-400':   (result.probabilidad_falla ?? 0) < 60,
            'text-red-400':     (result.probabilidad_falla ?? 0) >= 60,
          })}>
            {result.probabilidad_falla ?? '—'}%
          </p>
        </div>
        <div className="bg-slate-800/60 border border-slate-700/40 rounded-xl p-3 text-center flex flex-col items-center justify-center">
          <Clock className="w-5 h-5 text-violet-400 mb-1" />
          <p className="text-xs text-slate-400">Próxima inspección</p>
          <p className="text-xs font-semibold text-violet-300 mt-0.5">
            {result.scorePct >= 70 ? '12 meses' : result.scorePct >= 50 ? '6 meses' : '1 mes'}
          </p>
        </div>
      </div>

      {/* NDT Tools */}
      {ndtLabels.length > 0 && (
        <div className="bg-slate-800/60 border border-slate-700/40 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <Wrench className="w-3.5 h-3.5 text-sky-400" />
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Herramientas NDT</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {ndtLabels.map((label) => (
              <span key={label} className="px-2 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/30 text-[10px] text-sky-300">
                {label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* FRM Risks */}
      {frmLabels.length > 0 && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
            <p className="text-[10px] font-semibold text-red-400 uppercase tracking-wider">
              {frmLabels.length} protocolo{frmLabels.length > 1 ? 's' : ''} de riesgo fatal
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {frmLabels.map((r) => (
              <span key={r.label} className="px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/30 text-[10px] text-red-300">
                {'icon' in r ? r.icon : ''} {r.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Field findings */}
      {result.findings && (
        <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-4">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Hallazgos de campo</p>
          <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{result.findings}</p>
        </div>
      )}

      {/* Field photos */}
      {result.photos && result.photos.length > 0 && (
        <div className="bg-slate-800/60 border border-slate-700/40 rounded-xl p-3">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Fotos de campo ({result.photos.length})
          </p>
          <div className="grid grid-cols-4 gap-2">
            {result.photos.map((url, i) => (
              <div key={i} className="relative group aspect-square rounded-lg overflow-hidden bg-slate-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                <button
                  onClick={() => setPhotoPreview(url)}
                  className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                >
                  <ZoomIn className="w-4 h-4 text-white" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Diagnostico */}
      <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-4 h-4 text-sky-400" />
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Diagnóstico</p>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{result.diagnostico}</p>
      </div>

      {/* Recomendaciones */}
      {result.recomendaciones && (
        <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Recomendaciones</p>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{result.recomendaciones}</p>
        </div>
      )}

      <p className="text-[10px] text-slate-600 text-center">
        CIRSOC 101/102 · ISO 13822 · Ley 19587 (Argentina)
      </p>

      {/* Photo lightbox */}
      {photoPreview && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setPhotoPreview(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoPreview} alt="Foto de campo"
            className="max-w-full max-h-full rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setPhotoPreview(null)}
            className="absolute top-4 right-4 p-2 bg-slate-800 rounded-xl hover:bg-slate-700"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
      )}
    </div>
  )
}

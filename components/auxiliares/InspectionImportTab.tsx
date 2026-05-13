'use client'

import { useState, useRef, useEffect } from 'react'
import { Upload, CheckCircle2, Clock, FileSpreadsheet, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface Program {
  id:           string
  filename:     string
  uploaded_at:  string
  is_active:    boolean
  total_assets: number | null
  notes:        string | null
}

interface Props { isSuperusuario: boolean }

export default function InspectionImportTab({ isSuperusuario }: Props) {
  const [programs,   setPrograms]   = useState<Program[]>([])
  const [loading,    setLoading]    = useState(true)
  const [importing,  setImporting]  = useState(false)
  const [importMsg,  setImportMsg]  = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/inspection-plan/programs')
      .then((r) => r.json())
      .then((data) => { setPrograms(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportMsg(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res  = await fetch('/api/inspection-plan/import', { method: 'POST', body: formData })
      const data = await res.json()

      console.log('[Import response]', res.status, data)

      if (!res.ok) {
        setImportMsg({
          type: 'err',
          text: data.error ?? `Error ${res.status} al importar`,
        })
      } else {
        setImportMsg({
          type: 'ok',
          text: `Importado: ${data.items_count} activos · ${data.routes_count} rutas`,
        })
        // Refresh programs list
        const listRes = await fetch('/api/inspection-plan/programs')
        setPrograms(await listRes.json())
      }
    } catch {
      setImportMsg({ type: 'err', text: 'Error de conexión al importar' })
    } finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const activeProgram = programs.find((p) => p.is_active)

  return (
    <div className="flex flex-col gap-5">

      {/* ── Active program banner ── */}
      {activeProgram && (
        <div className="flex items-center gap-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-200">Programa activo</p>
            <p className="text-xs text-slate-500 truncate">
              {activeProgram.filename} · {activeProgram.total_assets ?? '?'} activos ·{' '}
              {new Date(activeProgram.uploaded_at).toLocaleDateString('es-AR', {
                day: '2-digit', month: 'short', year: 'numeric',
              })}
            </p>
          </div>
          <Link
            href="/inspection-plan"
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs
                       bg-sky-600 hover:bg-sky-500 text-white rounded-lg transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            Ver programa
          </Link>
        </div>
      )}

      {/* ── Import (superusuario only) ── */}
      {isSuperusuario && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-200">Importar nuevo programa</h3>
          </div>
          <p className="text-xs text-slate-500">
            Cargar el archivo Excel con las hojas <strong className="text-slate-400">Gantt 2026-2027</strong>{' '}
            y <strong className="text-slate-400">Rutas de Inspección</strong>. Al importar, el programa
            anterior queda archivado.
          </p>

          <div className="flex items-center gap-3 flex-wrap">
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleImport}
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={importing}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-600
                         hover:border-sky-500/50 text-slate-300 hover:text-white text-sm
                         transition-colors disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              {importing ? 'Procesando...' : 'Seleccionar Excel'}
            </button>

            {importMsg && (
              <div className={cn(
                'flex items-center gap-2 text-xs px-3 py-2 rounded-lg border',
                importMsg.type === 'ok'
                  ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5'
                  : 'text-red-400 border-red-500/20 bg-red-500/5'
              )}>
                {importMsg.type === 'ok'
                  ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                  : <span className="text-red-400">✕</span>
                }
                {importMsg.text}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── History ── */}
      <div>
        <h3 className="text-sm font-semibold text-slate-200 mb-3">Historial de importaciones</h3>

        {loading ? (
          <div className="flex items-center gap-2 text-slate-500 text-sm py-4">
            <div className="w-4 h-4 border-2 border-slate-600 border-t-sky-500 rounded-full animate-spin" />
            Cargando...
          </div>
        ) : programs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-600 gap-2">
            <FileSpreadsheet className="w-8 h-8 opacity-30" />
            <p className="text-sm">Sin programas importados</p>
          </div>
        ) : (
          <div className="space-y-2 overflow-x-auto">
            <div className="min-w-[480px]">
              {programs.map((p) => (
                <div
                  key={p.id}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors',
                    p.is_active
                      ? 'bg-emerald-500/5 border-emerald-500/20'
                      : 'bg-slate-800/20 border-slate-700/30 opacity-60'
                  )}
                >
                  <FileSpreadsheet className={cn('w-4 h-4 flex-shrink-0',
                    p.is_active ? 'text-emerald-400' : 'text-slate-600')} />

                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-300 truncate">{p.filename}</p>
                    <p className="text-[10px] text-slate-600 mt-0.5">
                      {new Date(p.uploaded_at).toLocaleDateString('es-AR', {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                      {p.total_assets != null && ` · ${p.total_assets} activos`}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {p.is_active ? (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-400
                                       bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.5">
                        <CheckCircle2 className="w-3 h-3" /> Activo
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] text-slate-500
                                       bg-slate-800/50 border border-slate-700/30 rounded-full px-2 py-0.5">
                        <Clock className="w-3 h-3" /> Archivado
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

'use client'

import { useState, useRef } from 'react'
import { FileText, Image as ImageIcon, Upload, Trash2, Eye, Printer, X, Search, Tag, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Report {
  id: string
  nombre: string
  tipo: 'pdf' | 'imagen'
  url: string
  asset_tag: string | null
  descripcion: string | null
  fecha: string
}

interface ReportsLibraryProps {
  reports: Report[]
  onUpload: (report: Report) => void
  onDelete: (id: string) => void
}

const PAGE_SIZE = 20

export default function ReportsLibrary({ reports, onUpload, onDelete }: ReportsLibraryProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [viewer, setViewer] = useState<Report | null>(null)
  const [search, setSearch] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [visible, setVisible] = useState(PAGE_SIZE)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  // Upload form state
  const [uploadForm, setUploadForm] = useState({
    nombre: '',
    assetTag: '',
    descripcion: '',
  })
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [pendingFile, setPendingFile] = useState<{ file: File; tipo: 'pdf' | 'imagen' } | null>(null)

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    const isPdf = file.type === 'application/pdf'
    const isImage = file.type.startsWith('image/')
    if (!isPdf && !isImage) {
      setUploadError('Solo se aceptan PDF e imágenes.')
      return
    }
    if (file.size > 20 * 1024 * 1024) {
      setUploadError('El archivo supera el límite de 20 MB.')
      return
    }

    setUploadError('')
    setPendingFile({ file, tipo: isPdf ? 'pdf' : 'imagen' })
    setUploadForm({ nombre: file.name.replace(/\.[^.]+$/, ''), assetTag: '', descripcion: '' })
    setShowUploadForm(true)
  }

  async function handleUploadSubmit() {
    if (!pendingFile) return
    setUploading(true)
    setUploadError('')

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => {
          const result = e.target?.result as string
          // strip data URL prefix
          resolve(result.split(',')[1])
        }
        reader.onerror = reject
        reader.readAsDataURL(pendingFile.file)
      })

      const res = await fetch('/api/structural/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: uploadForm.nombre || pendingFile.file.name,
          tipo: pendingFile.tipo,
          base64,
          assetTag: uploadForm.assetTag || undefined,
          descripcion: uploadForm.descripcion || undefined,
        }),
      })

      if (!res.ok) {
        const { error } = await res.json()
        setUploadError(error || 'Error al subir.')
        return
      }

      const saved: Report = await res.json()
      onUpload(saved)
      setShowUploadForm(false)
      setPendingFile(null)
      setUploadForm({ nombre: '', assetTag: '', descripcion: '' })
    } catch {
      setUploadError('Error de red al subir el archivo.')
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(id: string) {
    await fetch('/api/structural/reports', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    onDelete(id)
    setConfirmDelete(null)
    if (viewer?.id === id) setViewer(null)
  }

  // Filter
  const filtered = reports.filter((r) => {
    const q = search.toLowerCase()
    const matchQ = !q || r.nombre.toLowerCase().includes(q) || r.descripcion?.toLowerCase().includes(q)
    const matchTag = !tagFilter || r.asset_tag?.toLowerCase().includes(tagFilter.toLowerCase())
    const matchFrom = !dateFrom || r.fecha.slice(0, 10) >= dateFrom
    const matchTo = !dateTo || r.fecha.slice(0, 10) <= dateTo
    return matchQ && matchTag && matchFrom && matchTo
  })
  const shown = filtered.slice(0, visible)
  const remaining = filtered.length - visible

  function clearFilters() {
    setSearch(''); setTagFilter(''); setDateFrom(''); setDateTo(''); setVisible(PAGE_SIZE)
  }

  return (
    <div className="h-full flex flex-col gap-4">

      {/* Header + upload trigger */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-300">Biblioteca de Informes</p>
          <p className="text-[10px] text-slate-500">{reports.length} documento{reports.length !== 1 ? 's' : ''} almacenado{reports.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition-colors"
        >
          <Upload className="w-3.5 h-3.5" />
          Subir documento
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {uploadError && <p className="text-xs text-red-400">{uploadError}</p>}

      {/* Upload form modal */}
      {showUploadForm && pendingFile && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-800 rounded-2xl border border-slate-700 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-200">Subir documento</p>
              <button onClick={() => { setShowUploadForm(false); setPendingFile(null) }}>
                <X className="w-4 h-4 text-slate-400 hover:text-white" />
              </button>
            </div>

            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900/50 border border-slate-700">
              {pendingFile.tipo === 'pdf'
                ? <FileText className="w-4 h-4 text-red-400 shrink-0" />
                : <ImageIcon className="w-4 h-4 text-sky-400 shrink-0" />}
              <p className="text-xs text-slate-300 truncate">{pendingFile.file.name}</p>
              <span className="ml-auto text-[10px] text-slate-500">
                {(pendingFile.file.size / 1024 / 1024).toFixed(1)} MB
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="kira-label">Nombre del documento</label>
                <input
                  className="kira-input"
                  value={uploadForm.nombre}
                  onChange={(e) => setUploadForm(f => ({ ...f, nombre: e.target.value }))}
                  placeholder="Ej: Informe inspección Puente A"
                />
              </div>
              <div>
                <label className="kira-label">TAG / Activo (opcional)</label>
                <input
                  className="kira-input"
                  value={uploadForm.assetTag}
                  onChange={(e) => setUploadForm(f => ({ ...f, assetTag: e.target.value }))}
                  placeholder="Ej: EST-001"
                />
              </div>
              <div>
                <label className="kira-label">Descripción (opcional)</label>
                <textarea
                  className="kira-input resize-none"
                  rows={2}
                  value={uploadForm.descripcion}
                  onChange={(e) => setUploadForm(f => ({ ...f, descripcion: e.target.value }))}
                  placeholder="Breve descripción del documento..."
                />
              </div>
            </div>

            {uploadError && <p className="text-xs text-red-400">{uploadError}</p>}

            <div className="flex gap-2">
              <button
                onClick={() => { setShowUploadForm(false); setPendingFile(null) }}
                className="flex-1 px-3 py-2 rounded-lg border border-slate-600 text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleUploadSubmit}
                disabled={uploading || !uploadForm.nombre.trim()}
                className="flex-1 px-3 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-semibold transition-colors"
              >
                {uploading ? 'Subiendo...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search + filters */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              className="kira-input pl-8"
              placeholder="Buscar por nombre..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setVisible(PAGE_SIZE) }}
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-colors',
              showFilters ? 'border-sky-500/50 bg-sky-500/10 text-sky-300' : 'border-slate-700 text-slate-400 hover:text-slate-200'
            )}
          >
            <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', showFilters && 'rotate-180')} />
            Filtros
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-3 gap-2">
            <div className="relative">
              <Tag className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
              <input
                className="kira-input pl-7 text-[11px]"
                placeholder="TAG"
                value={tagFilter}
                onChange={(e) => { setTagFilter(e.target.value); setVisible(PAGE_SIZE) }}
              />
            </div>
            <input
              type="date"
              className="kira-input text-[11px]"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setVisible(PAGE_SIZE) }}
            />
            <input
              type="date"
              className="kira-input text-[11px]"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setVisible(PAGE_SIZE) }}
            />
          </div>
        )}

        {(search || tagFilter || dateFrom || dateTo) && (
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-slate-500">{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</p>
            <button onClick={clearFilters} className="text-[10px] text-sky-400 hover:text-sky-300">
              Limpiar filtros
            </button>
          </div>
        )}
      </div>

      {/* Reports list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="w-10 h-10 text-slate-700 mb-3" />
          <p className="text-sm text-slate-500">No hay documentos</p>
          <p className="text-[10px] text-slate-600 mt-1">Sube PDF o imágenes de inspección</p>
        </div>
      ) : (
        <div className="space-y-1.5 flex-1 overflow-y-auto">
          {shown.map((r) => (
            <div
              key={r.id}
              className={cn(
                'group flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors cursor-pointer',
                viewer?.id === r.id
                  ? 'border-sky-500/50 bg-sky-500/10'
                  : 'border-slate-700/50 bg-slate-800/40 hover:border-slate-600'
              )}
              onClick={() => setViewer(r)}
            >
              {r.tipo === 'pdf'
                ? <FileText className="w-5 h-5 text-red-400 shrink-0" />
                : <ImageIcon className="w-5 h-5 text-sky-400 shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-200 truncate">{r.nombre}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {r.asset_tag && (
                    <span className="text-[10px] text-sky-400 font-mono">{r.asset_tag}</span>
                  )}
                  <span className="text-[10px] text-slate-600">
                    {new Date(r.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                {r.descripcion && (
                  <p className="text-[10px] text-slate-500 truncate mt-0.5">{r.descripcion}</p>
                )}
              </div>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => { e.stopPropagation(); setViewer(r) }}
                  title="Ver"
                  className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5 text-slate-300" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirmDelete(r.id) }}
                  title="Eliminar"
                  className="p-1.5 rounded-lg bg-red-900/50 hover:bg-red-800 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                </button>
              </div>
            </div>
          ))}

          {remaining > 0 && (
            <button
              onClick={() => setVisible(v => v + PAGE_SIZE)}
              className="w-full py-2 text-xs text-sky-400 hover:text-sky-300 transition-colors"
            >
              Ver más ({remaining} restantes)
            </button>
          )}
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-xs bg-slate-800 rounded-2xl border border-slate-700 p-5 space-y-4">
            <p className="text-sm font-semibold text-slate-200">¿Eliminar documento?</p>
            <p className="text-xs text-slate-400">Esta acción no se puede deshacer.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 px-3 py-2 rounded-lg border border-slate-600 text-xs text-slate-400 hover:text-slate-200"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="flex-1 px-3 py-2 rounded-lg bg-red-700 hover:bg-red-600 text-white text-xs font-semibold"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Integrated viewer */}
      {viewer && (
        <div className="fixed inset-0 z-40 bg-black/90 flex flex-col">
          {/* Viewer toolbar */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-3">
              {viewer.tipo === 'pdf'
                ? <FileText className="w-4 h-4 text-red-400" />
                : <ImageIcon className="w-4 h-4 text-sky-400" />}
              <div>
                <p className="text-sm font-semibold text-slate-200">{viewer.nombre}</p>
                {viewer.asset_tag && (
                  <p className="text-[10px] text-sky-400 font-mono">{viewer.asset_tag}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={viewer.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  // trigger print in new window for PDF
                  if (viewer.tipo === 'pdf') {
                    const w = window.open(viewer.url, '_blank')
                    w?.addEventListener('load', () => w.print())
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs text-slate-300 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                Imprimir / Abrir
              </a>
              <button
                onClick={() => setViewer(null)}
                className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors"
              >
                <X className="w-4 h-4 text-slate-300" />
              </button>
            </div>
          </div>

          {/* Viewer content */}
          <div className="flex-1 overflow-hidden">
            {viewer.tipo === 'pdf' ? (
              <iframe
                src={`${viewer.url}#toolbar=1&navpanes=0`}
                className="w-full h-full"
                title={viewer.nombre}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center p-4 overflow-auto">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={viewer.url}
                  alt={viewer.nombre}
                  className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

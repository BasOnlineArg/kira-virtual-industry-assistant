'use client'

import { useRef, useState } from 'react'
import { Upload, X, ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ImageDropzoneProps {
  file: File | null
  preview: string | null
  onFileChange: (file: File, preview: string) => void
  onClear: () => void
  disabled?: boolean
}

const MAX_SIZE_MB = 8
const ACCEPTED = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

export default function ImageDropzone({
  file,
  preview,
  onFileChange,
  onClear,
  disabled,
}: ImageDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function validate(f: File): string | null {
    if (!ACCEPTED.includes(f.type)) return 'Formato no soportado. Usá JPEG, PNG o WebP.'
    if (f.size > MAX_SIZE_MB * 1024 * 1024)
      return `La imagen supera el límite de ${MAX_SIZE_MB} MB.`
    return null
  }

  function process(f: File) {
    const err = validate(f)
    if (err) { setError(err); return }
    setError(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      if (e.target?.result) onFileChange(f, e.target.result as string)
    }
    reader.readAsDataURL(f)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) process(f)
  }

  // ── With preview ───────────────────────────────────────────────────────────
  if (preview) {
    return (
      <div className="relative rounded-xl overflow-hidden border border-slate-700/50 bg-slate-900">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={preview}
          alt="Preview"
          className="w-full max-h-72 object-contain bg-slate-950"
        />
        <div className="absolute top-2 right-2 flex gap-2">
          {!disabled && (
            <button
              onClick={onClear}
              className="w-7 h-7 bg-slate-900/90 hover:bg-red-500/80 border border-slate-600
                         rounded-full flex items-center justify-center transition-colors"
              title="Quitar imagen"
            >
              <X className="w-3.5 h-3.5 text-slate-300" />
            </button>
          )}
        </div>
        <div className="px-3 py-2 border-t border-slate-700/50">
          <p className="text-xs text-slate-400 truncate">{file?.name}</p>
          <p className="text-[10px] text-slate-600">
            {file ? (file.size / 1024 / 1024).toFixed(2) + ' MB' : ''}
          </p>
        </div>
      </div>
    )
  }

  // ── Drop zone ──────────────────────────────────────────────────────────────
  return (
    <div>
      <div
        className={cn(
          'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
          dragging
            ? 'border-sky-500 bg-sky-500/5'
            : 'border-slate-700 hover:border-slate-500 bg-slate-900/50',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        onClick={() => !disabled && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={disabled ? undefined : handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) process(f) }}
          disabled={disabled}
        />
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center">
            <ImageIcon className="w-6 h-6 text-slate-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-300">
              Arrastrá la imagen o{' '}
              <span className="text-sky-400">hacé click aquí</span>
            </p>
            <p className="text-xs text-slate-600 mt-1">
              JPEG, PNG, WebP · Máx. {MAX_SIZE_MB} MB
            </p>
            <p className="text-xs text-slate-600">
              Soporta imágenes termográficas
            </p>
          </div>
        </div>
      </div>
      {error && (
        <p className="mt-2 text-xs text-red-400">{error}</p>
      )}
    </div>
  )
}

'use client'

import { useRef, useState } from 'react'
import { Camera, X, ZoomIn } from 'lucide-react'
import { cn } from '@/lib/utils'

const MAX_PHOTOS = 8
const MAX_MB = 5

interface FieldPhotosProps {
  photos: string[]          // base64 data URLs
  onChange: (photos: string[]) => void
  disabled?: boolean
}

export default function FieldPhotos({ photos, onChange, disabled }: FieldPhotosProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function handleFiles(files: FileList) {
    setError('')
    const toAdd: string[] = []
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue
      if (file.size > MAX_MB * 1024 * 1024) {
        setError(`"${file.name}" supera el límite de ${MAX_MB} MB.`)
        continue
      }
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onload = (e) => resolve(e.target?.result as string)
        reader.readAsDataURL(file)
      })
      toAdd.push(dataUrl)
    }
    const next = [...photos, ...toAdd].slice(0, MAX_PHOTOS)
    onChange(next)
  }

  function remove(idx: number) {
    onChange(photos.filter((_, i) => i !== idx))
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
          Fotos de campo
        </p>
        <span className="text-[10px] text-slate-600">{photos.length}/{MAX_PHOTOS}</span>
      </div>

      {/* Grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {photos.map((src, idx) => (
            <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden bg-slate-800">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                <button
                  onClick={() => setPreview(src)}
                  className="p-1 bg-slate-900/80 rounded-lg hover:bg-slate-700 transition-colors"
                >
                  <ZoomIn className="w-3.5 h-3.5 text-white" />
                </button>
                {!disabled && (
                  <button
                    onClick={() => remove(idx)}
                    className="p-1 bg-red-900/80 rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <X className="w-3.5 h-3.5 text-white" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload zone */}
      {photos.length < MAX_PHOTOS && !disabled && (
        <div
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-3 p-3 border-2 border-dashed border-slate-700
                     hover:border-slate-500 rounded-xl cursor-pointer transition-colors bg-slate-900/30"
        >
          <Camera className="w-5 h-5 text-slate-500" />
          <div>
            <p className="text-xs text-slate-400">Agregar fotos de campo</p>
            <p className="text-[10px] text-slate-600">JPG · PNG · WebP · Máx {MAX_MB} MB c/u</p>
          </div>
          <input
            ref={inputRef} type="file" multiple
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => { if (e.target.files) handleFiles(e.target.files); e.target.value = '' }}
          />
        </div>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}

      {/* Lightbox */}
      {preview && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setPreview(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Preview"
            className="max-w-full max-h-full rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setPreview(null)}
            className="absolute top-4 right-4 p-2 bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
      )}
    </div>
  )
}

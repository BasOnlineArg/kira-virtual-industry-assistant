'use client'

import { useState, useCallback } from 'react'
import { MessageSquare, BookOpen, Library, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import ManualLibraryPanel from './ManualLibraryPanel'
import ChatPanel from './ChatPanel'
import DocViewer from './DocViewer'
import type { Manual, ChatSession } from '@/lib/manuals/types'

interface Props {
  initialManuals:  Manual[]
  initialSessions: ChatSession[]
}

type ActiveTab = 'chat' | 'viewer'

export default function ManualsClient({ initialManuals, initialSessions }: Props) {
  const [manuals,      setManuals]      = useState<Manual[]>(initialManuals)
  const [selectedDoc,  setSelectedDoc]  = useState<Manual | null>(null)
  const [activeTab,    setActiveTab]    = useState<ActiveTab>('chat')
  const [showLibrary,  setShowLibrary]  = useState(false)

  const handleSelectDoc = useCallback((m: Manual) => {
    setSelectedDoc(m)
    setActiveTab('viewer')
  }, [])

  const handleDelete = useCallback(async (id: string) => {
    setManuals((prev) => prev.filter((m) => m.id !== id))
    if (selectedDoc?.id === id) setSelectedDoc(null)
    try {
      await fetch('/api/manuals', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
    } catch (e) {
      console.error('[Manuals] delete error', e)
    }
  }, [selectedDoc])

  const handleNewManual = useCallback((m: Manual) => {
    setManuals((prev) => [m, ...prev])
    // Poll for processed state
    if (!m.procesado) {
      const interval = setInterval(async () => {
        const res = await fetch('/api/manuals')
        if (!res.ok) { clearInterval(interval); return }
        const all = await res.json() as Manual[]
        const updated = all.find((x) => x.id === m.id)
        if (updated?.procesado) {
          setManuals((prev) => prev.map((x) => x.id === m.id ? updated : x))
          clearInterval(interval)
        }
      }, 4000)
      // Stop polling after 3 minutes
      setTimeout(() => clearInterval(interval), 180_000)
    }
  }, [])

  return (
    <div className="flex gap-4 h-full min-h-0 relative">

      {/* ── Mobile backdrop ──────────────────────────────────────────────── */}
      {showLibrary && (
        <div
          className="fixed inset-0 z-20 bg-black/50 md:hidden"
          onClick={() => setShowLibrary(false)}
        />
      )}

      {/* ── LEFT: Library panel ─────────────────────────────────────────── */}
      {/* Mobile: fixed overlay from the left; md+: static sidebar */}
      <div
        className={cn(
          'shrink-0 overflow-hidden flex flex-col',
          // Mobile
          'fixed top-0 left-0 h-full w-72 z-30 transition-transform duration-300 md:hidden',
          showLibrary ? 'translate-x-0' : '-translate-x-full',
          // md+
          'md:static md:translate-x-0 md:w-64 xl:md:w-72 md:h-auto md:z-auto md:transition-none',
        )}
      >
        {/* Mobile close button row */}
        <div className="flex items-center justify-end px-3 pt-3 md:hidden">
          <button
            onClick={() => setShowLibrary(false)}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded-lg transition-colors"
            title="Cerrar biblioteca"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <ManualLibraryPanel
          manuals={manuals}
          selectedId={selectedDoc?.id ?? null}
          onSelect={(m) => { handleSelectDoc(m); setShowLibrary(false) }}
          onDelete={handleDelete}
          onNewManual={handleNewManual}
        />
      </div>

      {/* ── RIGHT: Tabbed panel ──────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col bg-slate-800/20 border border-slate-700/40 rounded-2xl overflow-hidden">

        {/* Tab bar */}
        <div className="flex shrink-0 border-b border-slate-700/50">
          {/* Mobile: Biblioteca toggle button */}
          <button
            onClick={() => setShowLibrary((v) => !v)}
            className={cn(
              'md:hidden flex items-center gap-2 px-4 py-3 text-xs font-medium border-b-2 transition-colors',
              showLibrary
                ? 'border-sky-500 text-sky-300'
                : 'border-transparent text-slate-500 hover:text-slate-300',
            )}
          >
            <Library className="w-3.5 h-3.5" />
            Biblioteca
          </button>

          <button
            onClick={() => setActiveTab('chat')}
            className={cn(
              'flex items-center gap-2 px-5 py-3 text-xs font-medium border-b-2 transition-colors',
              activeTab === 'chat'
                ? 'border-violet-500 text-violet-300'
                : 'border-transparent text-slate-500 hover:text-slate-300',
            )}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Consulta IA E-RAG
          </button>
          <button
            onClick={() => setActiveTab('viewer')}
            className={cn(
              'flex items-center gap-2 px-5 py-3 text-xs font-medium border-b-2 transition-colors',
              activeTab === 'viewer'
                ? 'border-emerald-500 text-emerald-300'
                : 'border-transparent text-slate-500 hover:text-slate-300',
            )}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Visor
            {selectedDoc && (
              <span className="max-w-[120px] truncate text-[10px] opacity-70">{selectedDoc.nombre}</span>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0">
          {activeTab === 'chat' && (
            <ChatPanel manuals={manuals} initialSessions={initialSessions} />
          )}

          {activeTab === 'viewer' && (
            selectedDoc
              ? <DocViewer manual={selectedDoc} />
              : (
                <div className="flex flex-col items-center justify-center h-full text-slate-600 gap-2">
                  <BookOpen className="w-8 h-8 opacity-30" />
                  <p className="text-sm">Seleccioná un documento de la biblioteca</p>
                </div>
              )
          )}
        </div>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useRef, useState } from 'react'
import { Send, Brain, PanelRight } from 'lucide-react'
import MessageBubble, { TypingIndicator } from './MessageBubble'
import type { ChatMessage } from '@/lib/types'
import { cn } from '@/lib/utils'

interface ChatAreaProps {
  messages: ChatMessage[]
  isLoadingSession: boolean
  isWaitingForKira: boolean
  hasActiveSession: boolean
  sessionTitle: string
  onSendMessage: (content: string) => void
  onRenameSession: (title: string) => void
  onToggleSessions?: () => void
}

export default function ChatArea({
  messages,
  isLoadingSession,
  isWaitingForKira,
  hasActiveSession,
  sessionTitle,
  onSendMessage,
  onRenameSession,
  onToggleSessions,
}: ChatAreaProps) {
  const [input, setInput] = useState('')
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(sessionTitle)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isWaitingForKira])

  // Sync title draft when session changes
  useEffect(() => {
    setTitleDraft(sessionTitle)
    setEditingTitle(false)
  }, [sessionTitle])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleSend() {
    const trimmed = input.trim()
    if (!trimmed || isWaitingForKira || !hasActiveSession) return
    onSendMessage(trimmed)
    setInput('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  function handleTitleSave() {
    const trimmed = titleDraft.trim()
    if (trimmed && trimmed !== sessionTitle) {
      onRenameSession(trimmed)
    }
    setEditingTitle(false)
  }

  function handleTextareaChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value)
    // Auto-resize
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'
  }

  // ── Empty state ──────────────────────────────────────────────────────────
  if (!hasActiveSession) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8">
        <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700/50 flex items-center justify-center">
          <Brain className="w-8 h-8 text-slate-600" />
        </div>
        <div>
          <h2 className="text-slate-300 font-semibold mb-1">AI Research</h2>
          <p className="text-slate-500 text-sm max-w-xs">
            Seleccioná una sesión del panel izquierdo o creá una nueva para empezar a chatear con KIRA.
          </p>
        </div>
      </div>
    )
  }

  // ── Loading session ───────────────────────────────────────────────────────
  if (isLoadingSession) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-400">
          <span className="w-2 h-2 bg-sky-400 rounded-full animate-bounce [animation-delay:0ms]" />
          <span className="w-2 h-2 bg-sky-400 rounded-full animate-bounce [animation-delay:150ms]" />
          <span className="w-2 h-2 bg-sky-400 rounded-full animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-3.5 border-b border-slate-700/40 flex items-center gap-3 flex-shrink-0">
        {editingTitle ? (
          <input
            autoFocus
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={handleTitleSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleTitleSave()
              if (e.key === 'Escape') {
                setTitleDraft(sessionTitle)
                setEditingTitle(false)
              }
            }}
            className="flex-1 bg-transparent text-slate-200 text-sm font-medium
                       border-b border-sky-500 outline-none pb-0.5"
          />
        ) : (
          <button
            onClick={() => setEditingTitle(true)}
            className="flex-1 text-sm font-medium text-slate-300 hover:text-slate-100
                       truncate text-left transition-colors"
            title="Click para renombrar"
          >
            {sessionTitle}
          </button>
        )}
        {/* Toggle sessions — mobile only */}
        <button
          onClick={() => onToggleSessions?.()}
          className="md:hidden flex-shrink-0 p-1.5 text-slate-400 hover:text-slate-200
                     hover:bg-slate-700/50 rounded-lg transition-colors"
          title="Sesiones"
        >
          <PanelRight className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <p className="text-slate-500 text-sm">
              Esta es una nueva sesión. Escribí tu primera consulta abajo.
            </p>
            <div className="flex flex-wrap gap-2 justify-center max-w-lg">
              {[
                'Análisis de falla en rodamiento SKF',
                'Criterios ISO 10816 para bombas centrífugas',
                'RCA por método 5 por qué',
                'Interpretación de espectro de vibración',
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => {
                    setInput(suggestion)
                    textareaRef.current?.focus()
                  }}
                  className="px-3 py-1.5 text-xs text-slate-400 border border-slate-700 rounded-full
                             hover:border-sky-500/50 hover:text-sky-400 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <MessageBubble key={i} message={msg} />
            ))}
            {isWaitingForKira && <TypingIndicator />}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="px-6 pb-6 pt-3 flex-shrink-0 border-t border-slate-700/40">
        <div
          className={cn(
            'flex items-end gap-3 bg-slate-800 border rounded-2xl px-4 py-3 transition-colors',
            isWaitingForKira ? 'border-slate-700/40' : 'border-slate-600/60 focus-within:border-sky-500/50'
          )}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder={
              isWaitingForKira
                ? 'KIRA está procesando...'
                : 'Escribí tu consulta — Enter para enviar, Shift+Enter para nueva línea'
            }
            disabled={isWaitingForKira}
            rows={1}
            className="flex-1 bg-transparent text-slate-100 text-sm placeholder-slate-600
                       resize-none outline-none leading-relaxed disabled:opacity-50
                       max-h-40 overflow-y-auto"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isWaitingForKira}
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center
                       bg-sky-600 hover:bg-sky-500 disabled:opacity-30 disabled:cursor-not-allowed
                       rounded-xl transition-colors"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
        <p className="text-[10px] text-slate-700 mt-1.5 text-center">
          KIRA puede cometer errores. Verificá información crítica con las normas correspondientes.
        </p>
      </div>
    </div>
  )
}

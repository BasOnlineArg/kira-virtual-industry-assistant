'use client'

import { useState, useCallback } from 'react'
import SessionsSidebar from './SessionsSidebar'
import ChatArea from './ChatArea'
import { createSession, updateSession, deleteSession, renameSession } from '@/app/actions/research'
import { createClient } from '@/lib/supabase/client'
import type { ChatMessage } from '@/lib/types'

interface SessionMeta {
  id: string
  titulo: string
  created_at: string
  updated_at: string
}

interface ResearchClientProps {
  initialSessions: SessionMeta[]
}

export default function ResearchClient({ initialSessions }: ResearchClientProps) {
  const [sessions, setSessions] = useState<SessionMeta[]>(initialSessions)
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [activeTitle, setActiveTitle] = useState<string>('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoadingSession, setIsLoadingSession] = useState(false)
  const [isWaitingForKira, setIsWaitingForKira] = useState(false)
  const [showSessions, setShowSessions] = useState(false)

  const supabase = createClient()

  // ── Session management ────────────────────────────────────────────────────

  async function handleNewSession() {
    const session = await createSession()
    setSessions((prev) => [session, ...prev])
    setActiveSessionId(session.id)
    setActiveTitle(session.titulo)
    setMessages([])
  }

  async function handleSelectSession(id: string) {
    if (id === activeSessionId) return
    setIsLoadingSession(true)

    const { data } = await supabase
      .from('research_sessions')
      .select('messages, titulo')
      .eq('id', id)
      .single()

    setActiveSessionId(id)
    setActiveTitle(data?.titulo ?? '')
    setMessages(data?.messages ?? [])
    setIsLoadingSession(false)
  }

  async function handleDeleteSession(id: string) {
    await deleteSession(id)
    setSessions((prev) => prev.filter((s) => s.id !== id))
    if (activeSessionId === id) {
      setActiveSessionId(null)
      setActiveTitle('')
      setMessages([])
    }
  }

  async function handleRenameSession(titulo: string) {
    if (!activeSessionId) return
    await renameSession(activeSessionId, titulo)
    setActiveTitle(titulo)
    setSessions((prev) =>
      prev.map((s) => (s.id === activeSessionId ? { ...s, titulo } : s))
    )
  }

  // ── Messaging ─────────────────────────────────────────────────────────────

  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!activeSessionId || !content.trim() || isWaitingForKira) return

      const userMsg: ChatMessage = { role: 'user', content: content.trim() }
      const updatedMessages = [...messages, userMsg]
      setMessages(updatedMessages)
      setIsWaitingForKira(true)

      // Auto-title on first message
      const isFirst = messages.length === 0
      let newTitle = activeTitle
      if (isFirst) {
        newTitle =
          content.trim().slice(0, 48) + (content.trim().length > 48 ? '…' : '')
        setActiveTitle(newTitle)
        setSessions((prev) =>
          prev.map((s) =>
            s.id === activeSessionId ? { ...s, titulo: newTitle } : s
          )
        )
      }

      // Persist user message
      await updateSession(
        activeSessionId,
        updatedMessages,
        isFirst ? newTitle : undefined
      )

      // Call Claude API
      try {
        const res = await fetch('/api/claude', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: updatedMessages }),
        })

        const data = await res.json()

        let assistantContent: string
        if (!res.ok || data.error) {
          assistantContent = data.error ?? 'Error inesperado. Intentá de nuevo.'
        } else {
          assistantContent =
            data.content?.[0]?.text ?? 'No se pudo obtener respuesta.'
        }

        const assistantMsg: ChatMessage = {
          role: 'assistant',
          content: assistantContent,
        }
        const finalMessages = [...updatedMessages, assistantMsg]
        setMessages(finalMessages)
        await updateSession(activeSessionId, finalMessages)
      } catch {
        const errorMsg: ChatMessage = {
          role: 'assistant',
          content: 'Error de conexión. Verificá tu red e intentá de nuevo.',
        }
        const errMessages = [...updatedMessages, errorMsg]
        setMessages(errMessages)
        await updateSession(activeSessionId, errMessages)
      } finally {
        setIsWaitingForKira(false)
      }
    },
    [activeSessionId, messages, activeTitle, isWaitingForKira]
  )

  // ── Layout: Chat (centro) | Sesiones (derecha) ────────────────────────────

  return (
    <div className="flex h-full overflow-hidden">
      {/* Chat — ocupa todo el centro */}
      <ChatArea
        messages={messages}
        isLoadingSession={isLoadingSession}
        isWaitingForKira={isWaitingForKira}
        hasActiveSession={!!activeSessionId}
        sessionTitle={activeTitle}
        onSendMessage={handleSendMessage}
        onRenameSession={handleRenameSession}
        onToggleSessions={() => setShowSessions((v) => !v)}
      />
      {/* Sesiones — panel derecho */}
      <SessionsSidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onNewSession={handleNewSession}
        onSelectSession={handleSelectSession}
        onDeleteSession={handleDeleteSession}
        isOpen={showSessions}
        onClose={() => setShowSessions(false)}
      />
    </div>
  )
}

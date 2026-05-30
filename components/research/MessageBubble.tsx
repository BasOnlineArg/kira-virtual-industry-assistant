'use client'

import { useState } from 'react'
import Image from 'next/image'
import { User } from 'lucide-react'
import type { ChatMessage } from '@/lib/types'


// ─── Simple markdown renderer ─────────────────────────────────────────────────

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*.*?\*\*|`[^`]+`)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-slate-100">
          {part.slice(2, -2)}
        </strong>
      )
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={i}
          className="bg-slate-950 px-1.5 py-0.5 rounded text-xs font-mono text-sky-300"
        >
          {part.slice(1, -1)}
        </code>
      )
    }
    return <span key={i}>{part}</span>
  })
}

function MarkdownContent({ content }: { content: string }) {
  const segments = content.split(/(```[\s\S]*?```)/g)

  return (
    <div className="space-y-2">
      {segments.map((segment, i) => {
        if (segment.startsWith('```')) {
          const newline = segment.indexOf('\n')
          const code =
            newline > 0 ? segment.slice(newline + 1, -3) : segment.slice(3, -3)
          return (
            <pre
              key={i}
              className="bg-slate-950 border border-slate-700/60 rounded-lg p-3 text-xs font-mono text-slate-200 overflow-x-auto"
            >
              <code>{code.trim()}</code>
            </pre>
          )
        }

        const lines = segment.split('\n')
        return (
          <div key={i}>
            {lines.map((line, j) => {
              if (line.trim() === '') return <div key={j} className="h-1" />

              if (line.trim().match(/^[-•]\s/)) {
                return (
                  <div key={j} className="flex gap-2 text-sm leading-relaxed">
                    <span className="text-sky-500 flex-shrink-0 mt-0.5">•</span>
                    <span>{renderInline(line.trim().slice(2))}</span>
                  </div>
                )
              }
              if (line.startsWith('### '))
                return (
                  <p key={j} className="text-sm font-semibold text-slate-100 mt-2">
                    {line.slice(4)}
                  </p>
                )
              if (line.startsWith('## '))
                return (
                  <p key={j} className="text-sm font-bold text-slate-100 mt-2">
                    {line.slice(3)}
                  </p>
                )
              if (line.startsWith('# '))
                return (
                  <p key={j} className="text-base font-bold text-slate-100 mt-2">
                    {line.slice(2)}
                  </p>
                )

              return (
                <p key={j} className="text-sm leading-relaxed">
                  {renderInline(line)}
                </p>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

// ─── KIRA Avatar ──────────────────────────────────────────────────────────────

function KiraAvatar() {
  return (
    <div
      className="relative flex-shrink-0 overflow-hidden rounded-full ring-2 ring-sky-500/30 bg-slate-800"
      style={{ width: 60, height: 60 }}
    >
      <Image
        src="/kira-avatar-2.jpg"
        alt="KIRA"
        fill
        className="object-cover object-top"
        onError={(e) => {
          const parent = e.currentTarget.parentElement
          if (parent) {
            e.currentTarget.style.display = 'none'
            parent.innerHTML =
              '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin:20px auto 0;display:block"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="2" x2="9" y2="4"/><line x1="15" y1="2" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="22"/><line x1="15" y1="20" x2="15" y2="22"/><line x1="20" y1="9" x2="22" y2="9"/><line x1="20" y1="14" x2="22" y2="14"/><line x1="2" y1="9" x2="4" y2="9"/><line x1="2" y1="14" x2="4" y2="14"/></svg>'
          }
        }}
      />
    </div>
  )
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

export default function MessageBubble({ message }: { message: ChatMessage }) {
  const isKira = message.role === 'assistant'

  if (isKira) {
    return (
      <div className="flex gap-3 max-w-3xl">
        <KiraAvatar />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-sky-400 font-medium mb-1.5">KIRA</p>
          <div className="bg-slate-800/60 border border-slate-700/40 rounded-2xl rounded-tl-sm px-4 py-3 text-slate-200">
            <MarkdownContent content={message.content} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-3 max-w-3xl ml-auto flex-row-reverse">
      <div className="w-8 h-8 rounded-full flex-shrink-0 bg-slate-700 ring-2 ring-slate-600/30 flex items-center justify-center">
        <User className="w-4 h-4 text-slate-300" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-500 font-medium mb-1.5 text-right">Vos</p>
        <div className="bg-sky-600/20 border border-sky-500/20 rounded-2xl rounded-tr-sm px-4 py-3 text-slate-200">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    </div>
  )
}

// ─── Typing indicator ─────────────────────────────────────────────────────────

export function TypingIndicator() {
  return (
    <div className="flex gap-3 max-w-3xl">
      <KiraAvatar />
      <div className="flex-1">
        <p className="text-xs text-sky-400 font-medium mb-1.5">KIRA</p>
        <div className="bg-slate-800/60 border border-slate-700/40 rounded-2xl rounded-tl-sm px-4 py-3 inline-flex items-center gap-1.5">
          <span className="w-2 h-2 bg-sky-400 rounded-full animate-bounce [animation-delay:0ms]" />
          <span className="w-2 h-2 bg-sky-400 rounded-full animate-bounce [animation-delay:150ms]" />
          <span className="w-2 h-2 bg-sky-400 rounded-full animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState, useCallback } from 'react'
import type { W2HData, CatData, InspData, ProbData, TLEvent, AiResult } from './types'
import { EMPTY_W2H, emptyCatData } from './types'
import RcaW2HForm   from './RcaW2HForm'
import RcaIshikawa  from './RcaIshikawa'
import RcaAiPanel   from './RcaAiPanel'

interface Props { userName: string }

const genId = () => Math.random().toString(36).slice(2, 9)

export default function RcaClient({ userName: _userName }: Props) {
  const [step, setStep]     = useState(1)
  const [w2h,  setW2H]     = useState<W2HData>(EMPTY_W2H)
  const [catData, setCatData] = useState<CatData[]>(
    Array.from({ length: 9 }, emptyCatData)
  )
  const [inspData, setInspData] = useState<InspData>({ text: '', images: [] })
  const [probData, setProbData] = useState<ProbData>({ w2h: {}, images: [] })
  const [events,   setEvents]   = useState<TLEvent[]>([])
  const [aiData,   setAiData]   = useState<AiResult | null>(null)

  const goTo = useCallback((n: number) => setStep(n), [])

  // ── Step labels ─────────────────────────────────────────────────────────────
  const STEP_LABELS = ['5W2H', 'Ishikawa', 'IA + PDF']

  return (
    <div
      style={{
        background: '#eef0f3',
        minHeight: '100%',
        fontFamily: 'sans-serif',
        overflowY: 'auto',
      }}
    >
      {/* ── Step bar ──────────────────────────────────────────────────────────── */}
      <div style={{
        position: 'sticky', top: 0, background: '#fff',
        boxShadow: '0 1px 4px rgba(0,0,0,.08)', zIndex: 40,
        display: 'flex', justifyContent: 'center', padding: '10px 20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', width: '100%', maxWidth: 700 }}>
          {[1, 2, 3, 4].map(n => (
            <div key={n} style={{ display: 'flex', alignItems: 'center', flex: n < 4 ? 1 : undefined }}>
              {/* Dot */}
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, flexShrink: 0,
                border: `2px solid ${step > n ? '#0F6E56' : step === n ? '#1a4faf' : '#d1d5db'}`,
                background:  step > n ? '#0F6E56' : step === n ? '#1a4faf' : '#f9fafb',
                color: step >= n ? '#fff' : '#9ca3af',
                transition: 'all .2s',
              }}>
                {step > n ? '✓' : n}
              </div>
              {/* Label (shown on wider screens via media logic via inline) */}
              {n <= 3 && (
                <span style={{ fontSize: 10, color: step >= n ? '#1a4faf' : '#9ca3af', marginLeft: 6, whiteSpace: 'nowrap', fontWeight: step === n ? 700 : 400 }}>
                  {STEP_LABELS[n - 1]}
                </span>
              )}
              {/* Connector line */}
              {n < 4 && (
                <div style={{
                  flex: 1, height: 2, margin: '0 6px',
                  background: step > n ? '#0F6E56' : '#e5e7eb',
                  transition: 'background .2s',
                }} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Step content ──────────────────────────────────────────────────────── */}
      {step === 1 && (
        <RcaW2HForm
          w2h={w2h}
          onSubmit={data => {
            setW2H(data)
            setProbData(pd => ({ ...pd, w2h: data }))
            // Seed timeline with the primary event if empty
            setEvents(evs =>
              evs.length === 0 && data.what
                ? [{ id: genId(), dt: '', type: 'falla', desc: data.what, resp: data.who }]
                : evs
            )
            goTo(2)
          }}
        />
      )}

      {step === 2 && (
        <RcaIshikawa
          catData={catData}
          setCatData={setCatData}
          inspData={inspData}
          setInspData={setInspData}
          probData={probData}
          setProbData={setProbData}
          onBack={() => goTo(1)}
          onNext={() => { setAiData(null); goTo(3) }}
        />
      )}

      {step === 3 && (
        <RcaAiPanel
          w2h={w2h}
          catData={catData}
          inspData={inspData}
          events={events}
          setEvents={setEvents}
          aiData={aiData}
          setAiData={setAiData}
          onBack={() => goTo(2)}
        />
      )}
    </div>
  )
}

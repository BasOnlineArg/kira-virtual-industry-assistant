'use client'

import { useState, useCallback } from 'react'
import type { W2HData, CatData, InspData, ProbData, TLEvent, AiResult } from './types'
import { EMPTY_W2H, emptyCatData } from './types'
import RcaW2HForm   from './RcaW2HForm'
import RcaIshikawa  from './RcaIshikawa'
import RcaAiPanel   from './RcaAiPanel'

interface Props { userName: string }

const genId = () => Math.random().toString(36).slice(2, 9)

// ─── KIRA palette tokens ──────────────────────────────────────────────────────
const C = {
  pageBg:    '#020617',  // slate-950
  cardBg:    '#0f172a',  // slate-900
  surfaceBg: '#1e293b',  // slate-800
  border:    '#334155',  // slate-700
  accent:    '#0ea5e9',  // sky-500
  success:   '#34d399',  // emerald-400
  textPri:   '#f1f5f9',  // slate-100
  textSec:   '#94a3b8',  // slate-400
  textMut:   '#64748b',  // slate-500
}

export default function RcaClient({ userName: _userName }: Props) {
  const [step,    setStep]    = useState(1)
  const [w2h,     setW2H]    = useState<W2HData>(EMPTY_W2H)
  const [catData, setCatData] = useState<CatData[]>(Array.from({ length: 9 }, emptyCatData))
  const [inspData, setInspData] = useState<InspData>({ text: '', images: [] })
  const [probData, setProbData] = useState<ProbData>({ w2h: {}, images: [] })
  const [events,   setEvents]   = useState<TLEvent[]>([])
  const [aiData,   setAiData]   = useState<AiResult | null>(null)

  const goTo = useCallback((n: number) => setStep(n), [])

  const STEP_LABELS = ['5W2H', 'Ishikawa', 'IA + PDF']

  return (
    <div style={{ background: C.pageBg, minHeight: '100%', fontFamily: 'sans-serif', overflowY: 'auto' }}>

      {/* ── Step bar ──────────────────────────────────────────────────────────── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: C.cardBg,
        borderBottom: `1px solid ${C.border}`,
        display: 'flex', justifyContent: 'center', padding: '10px 20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', width: '100%', maxWidth: 700 }}>
          {[1, 2, 3, 4].map(n => (
            <div key={n} style={{ display: 'flex', alignItems: 'center', flex: n < 4 ? 1 : undefined }}>
              {/* Dot */}
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, flexShrink: 0, transition: 'all .2s',
                border: `2px solid ${step > n ? C.success : step === n ? C.accent : C.border}`,
                background:  step > n ? C.success : step === n ? C.accent : C.surfaceBg,
                color: step >= n ? '#fff' : C.textMut,
              }}>
                {step > n ? '✓' : n}
              </div>
              {/* Label */}
              {n <= 3 && (
                <span style={{
                  fontSize: 10, marginLeft: 6, whiteSpace: 'nowrap',
                  fontWeight: step === n ? 700 : 400,
                  color: step > n ? C.success : step === n ? C.accent : C.textMut,
                }}>
                  {STEP_LABELS[n - 1]}
                </span>
              )}
              {/* Connector */}
              {n < 4 && (
                <div style={{
                  flex: 1, height: 2, margin: '0 6px', transition: 'background .2s',
                  background: step > n ? C.success : C.surfaceBg,
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
          catData={catData}  setCatData={setCatData}
          inspData={inspData} setInspData={setInspData}
          probData={probData} setProbData={setProbData}
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

'use client'

import { useState, useCallback } from 'react'
import type { W2HData, CatData, InspData, ProbData, TLEvent, AiResult, CanvasImage } from './types'
import { EMPTY_W2H, emptyCatData } from './types'
import RcaW2HForm   from './RcaW2HForm'
import RcaIshikawa  from './RcaIshikawa'
import RcaAiPanel   from './RcaAiPanel'
import RcaHistory   from './RcaHistory'

interface Props { userName: string }

const genId = () => Math.random().toString(36).slice(2, 9)

/** Reconstruct CanvasImage array from persisted public URLs */
function loadImages(urls: string[]): Promise<CanvasImage[]> {
  return Promise.all(
    (urls ?? []).map(src =>
      new Promise<CanvasImage>(resolve => {
        const el = new Image()
        el.crossOrigin = 'anonymous'
        el.onload  = () => resolve({ src, el })
        el.onerror = () => resolve({ src, el })   // keep broken ref; canvas handles it gracefully
        el.src = src
      })
    )
  )
}

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
  const [step,        setStep]        = useState(1)
  const [w2h,         setW2H]         = useState<W2HData>(EMPTY_W2H)
  const [catData,     setCatData]     = useState<CatData[]>(Array.from({ length: 9 }, emptyCatData))
  const [inspData,    setInspData]    = useState<InspData>({ text: '', images: [] })
  const [probData,    setProbData]    = useState<ProbData>({ w2h: {}, images: [] })
  const [events,      setEvents]      = useState<TLEvent[]>([])
  const [aiData,      setAiData]      = useState<AiResult | null>(null)
  const [analysisId,  setAnalysisId]  = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [loadingHist, setLoadingHist] = useState(false)

  const goTo = useCallback((n: number) => setStep(n), [])

  const STEP_LABELS = ['5W2H', 'Ishikawa', 'IA + PDF']

  /** Reset all state and start a fresh analysis */
  function newAnalysis() {
    setW2H(EMPTY_W2H)
    setCatData(Array.from({ length: 9 }, emptyCatData))
    setInspData({ text: '', images: [] })
    setProbData({ w2h: {}, images: [] })
    setEvents([])
    setAiData(null)
    setAnalysisId(null)
    setStep(1)
  }

  /** Load a saved analysis from history, including reconstructing images from permanent URLs */
  async function loadAnalysis(id: string) {
    setLoadingHist(true)
    setShowHistory(false)
    try {
      const res = await fetch(`/api/rca/${id}`)
      if (!res.ok) throw new Error('No encontrado')
      const saved = await res.json()

      const loadedW2H: W2HData = {
        what: '', who: '', where: '', when: '',
        why: '', how: '', howmuch: '', responsable: '', nro: '',
        ...(saved.w2h ?? {}),
      }

      // Reconstruct CatData — load images in parallel across all 9 categories
      const loadedCats: CatData[] = await Promise.all(
        (saved.cat_data ?? []).map(
          async (d: { text?: string; causes?: string[]; image_urls?: string[] }) => ({
            text:   d.text   ?? '',
            causes: d.causes ?? [],
            images: await loadImages(d.image_urls ?? []),
          })
        )
      )
      // Pad to 9 categories if the saved data is shorter
      while (loadedCats.length < 9) loadedCats.push(emptyCatData())

      // Reconstruct inspector images
      const inspImages = await loadImages(saved.insp_image_urls ?? [])

      setW2H(loadedW2H)
      setCatData(loadedCats)
      setInspData({ text: saved.insp_text ?? '', images: inspImages })
      setProbData({ w2h: loadedW2H, images: [] })
      setEvents(saved.events ?? [])
      setAiData(saved.ai_result ?? null)
      setAnalysisId(id)
      setStep(3)
    } catch {
      alert('Error al cargar el análisis')
    } finally {
      setLoadingHist(false)
    }
  }

  return (
    <div style={{ background: C.pageBg, minHeight: '100%', fontFamily: 'sans-serif', overflowY: 'auto' }}>

      {/* ── Step bar ──────────────────────────────────────────────────────────── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: C.cardBg,
        borderBottom: `1px solid ${C.border}`,
        display: 'flex', alignItems: 'center', padding: '10px 20px', gap: 16,
      }}>
        {/* Steps */}
        <div style={{ display: 'flex', alignItems: 'center', flex: 1, maxWidth: 600 }}>
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

        {/* Right actions */}
        <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
          {analysisId && (
            <span style={{
              fontSize: 10, color: C.success, display: 'flex', alignItems: 'center', gap: 4,
              background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)',
              borderRadius: 20, padding: '3px 10px',
            }}>
              ✓ Guardado
            </span>
          )}
          <button
            onClick={() => setShowHistory(true)}
            disabled={loadingHist}
            style={{
              fontSize: 12, padding: '5px 12px', borderRadius: 6,
              border: `1px solid ${C.border}`, background: C.surfaceBg,
              cursor: 'pointer', color: C.textSec,
            }}
          >
            {loadingHist ? '⏳' : '📂'} Historial
          </button>
          <button
            onClick={newAnalysis}
            style={{
              fontSize: 12, padding: '5px 12px', borderRadius: 6,
              border: `1px solid ${C.accent}40`, background: `${C.accent}10`,
              cursor: 'pointer', color: C.accent,
            }}
          >
            + Nuevo análisis
          </button>
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
          analysisId={analysisId}
          onSaved={setAnalysisId}
          onBack={() => goTo(2)}
        />
      )}

      {/* ── History panel ─────────────────────────────────────────────────────── */}
      {showHistory && (
        <RcaHistory
          onLoad={loadAnalysis}
          onClose={() => setShowHistory(false)}
        />
      )}
    </div>
  )
}

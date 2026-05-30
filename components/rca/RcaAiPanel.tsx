'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import type { W2HData, CatData, InspData, TLEvent, AiResult } from './types'
import { TYPE_META, CATS } from './constants'

// ─── KIRA palette tokens ──────────────────────────────────────────────────────
const K = {
  pageBg:    '#020617',  // slate-950
  cardBg:    '#0f172a',  // slate-900
  surfaceBg: '#1e293b',  // slate-800
  border:    '#334155',  // slate-700
  accent:    '#0ea5e9',  // sky-500
  accentLt:  '#38bdf8',  // sky-400
  purple:    '#8b5cf6',  // violet-500
  textPri:   '#f1f5f9',  // slate-100
  textSec:   '#94a3b8',  // slate-400
  textMut:   '#64748b',  // slate-500
}

// Risk colors — vivid for dark bg
const RISK_COLOR: Record<string, string> = {
  CRITICO: '#ef4444',  // red-500
  ALTO:    '#f97316',  // orange-500
  MEDIO:   '#f59e0b',  // amber-500
  BAJO:    '#22c55e',  // green-500
}

const genId = () => Math.random().toString(36).slice(2, 9)

function fmtDt(dt: string) {
  if (!dt) return '—'
  const d = new Date(dt)
  return (
    d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  )
}
function today() {
  return new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  w2h:        W2HData
  catData:    CatData[]
  inspData:   InspData
  events:     TLEvent[]
  setEvents:  React.Dispatch<React.SetStateAction<TLEvent[]>>
  aiData:     AiResult | null
  setAiData:  React.Dispatch<React.SetStateAction<AiResult | null>>
  analysisId: string | null
  onSaved:    (id: string) => void
  onBack:     () => void
}

// ─── Component ────────────────────────────────────────────────────────────────
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export default function RcaAiPanel({
  w2h, catData, inspData, events, setEvents, aiData, setAiData,
  analysisId, onSaved, onBack,
}: Props) {
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')
  const [showForm,   setShowForm]   = useState(false)
  const [editId,     setEditId]     = useState<string | null>(null)
  const [evForm,     setEvForm]     = useState({ dt: '', type: 'condicion', desc: '', resp: '' })
  const [dragSrc,    setDragSrc]    = useState<number | null>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const pdfRef = useRef<HTMLDivElement>(null)

  useEffect(() => { if (!aiData) runAI() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function buildPrompt() {
    const catSections = CATS.map((cat, i) => {
      const d = catData[i]
      const obs    = d.text ? `Observaciones: ${d.text}` : ''
      const causes = d.causes.length ? `Causas:\n${d.causes.map((c, j) => `  ${j + 1}. ${c}`).join('\n')}` : ''
      return obs || causes ? `### ${cat.l}\n${[obs, causes].filter(Boolean).join('\n')}` : ''
    }).filter(Boolean).join('\n\n')

    return (
      `Sos un experto en RCA para instalaciones industriales mineras en Argentina. ` +
      `Devolvé ÚNICAMENTE un JSON válido sin texto adicional ni bloques de código.\n\n` +
      `## Evento (5W2H)\n- Qué: ${w2h.what || 'No especificado'}\n` +
      `- Quién: ${w2h.who || 'No especificado'}\n- Dónde: ${w2h.where || 'No especificado'}\n` +
      `- Cuándo: ${w2h.when || 'No especificado'}\n- Por qué (inicial): ${w2h.why || 'No especificado'}\n` +
      `- Cómo: ${w2h.how || 'No especificado'}\n- Impacto: ${w2h.howmuch || 'No especificado'}\n\n` +
      `## Ishikawa\n${catSections || 'Sin datos'}\n\n` +
      `## Insight Inspector\n${inspData.text || 'Sin observaciones'}\n\n` +
      `JSON: {"causa_raiz":"string","causas_contribuyentes":["string","string","string"],` +
      `"riesgo":"CRITICO|ALTO|MEDIO|BAJO","riesgo_justificacion":"string",` +
      `"acciones":[{"descripcion":"string","responsable":"string","plazo":"string"},` +
      `{"descripcion":"string","responsable":"string","plazo":"string"},` +
      `{"descripcion":"string","responsable":"string","plazo":"string"}],` +
      `"patrones":["string","string"],"conclusion":"string"}`
    )
  }

  async function runAI() {
    setLoading(true); setError(''); setAiData(null)
    try {
      const res = await fetch('/api/rca/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: buildPrompt() }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: AiResult = await res.json()
      setAiData(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  // ── Timeline ──────────────────────────────────────────────────────────────
  const sorted = [...events].sort((a, b) => a.dt.localeCompare(b.dt))

  function saveEvent() {
    if (!evForm.desc.trim()) { alert('Completá la descripción.'); return }
    if (editId) {
      setEvents(evs => evs.map(ev => ev.id === editId ? { ...ev, ...evForm, type: evForm.type as TLEvent['type'] } : ev))
    } else {
      setEvents(evs => [...evs, { id: genId(), ...evForm, type: evForm.type as TLEvent['type'] }])
    }
    setShowForm(false); setEditId(null)
    setEvForm({ dt: '', type: 'condicion', desc: '', resp: '' })
  }
  function editEvent(ev: TLEvent) {
    setEditId(ev.id); setEvForm({ dt: ev.dt, type: ev.type, desc: ev.desc, resp: ev.resp }); setShowForm(true)
  }
  function deleteEvent(id: string) {
    if (!confirm('¿Eliminar este evento?')) return
    setEvents(evs => evs.filter(e => e.id !== id))
  }
  function handleDrop(targetIdx: number) {
    if (dragSrc === null || dragSrc === targetIdx) return
    setEvents(evs => {
      const arr = [...evs]
      const si = arr.findIndex(x => x.id === sorted[dragSrc].id)
      const di = arr.findIndex(x => x.id === sorted[targetIdx].id)
      arr.splice(di, 0, arr.splice(si, 1)[0])
      return arr
    }); setDragSrc(null)
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  const saveAnalysis = useCallback(async () => {
    setSaveStatus('saving')
    try {
      // Serialize cat data: keep text + causes + permanent image URLs (skip blob:// ephemeral)
      const serCat = catData.map(({ text, causes, images }) => ({
        text,
        causes,
        image_urls: images.map(i => i.src).filter(s => !s.startsWith('blob:')),
      }))

      const payload = {
        title:           w2h.what.trim() || 'Análisis sin título',
        nro:             w2h.nro || '',
        w2h,
        cat_data:        serCat,
        insp_text:       inspData.text,
        insp_image_urls: inspData.images.map(i => i.src).filter(s => !s.startsWith('blob:')),
        events,
        ai_result:       aiData,
      }

      const method = analysisId ? 'PUT' : 'POST'
      const url    = analysisId ? `/api/rca/${analysisId}` : '/api/rca'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const saved = await res.json()
      onSaved(saved.id ?? analysisId!)
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch {
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    }
  }, [w2h, catData, inspData, events, aiData, analysisId, onSaved])

  // ── PDF ───────────────────────────────────────────────────────────────────
  const generatePDF = useCallback(() => {
    if (!pdfRef.current) return
    const ai = aiData

    const imgsHtml = (images: { src: string }[]) =>
      images?.length ? `<div class="pdf-imgs">${images.map(img => `<img src="${img.src}" alt="evidencia"/>`).join('')}</div>` : ''

    // PDF brand colors — print uses the updated sky/emerald/violet palette
    const ishiSections = CATS.map((cat, i) => {
      const d = catData[i]
      // Map dark canvas colors to print-friendly equivalents
      const printColor = cat.c === '#38bdf8' ? '#0369a1' : cat.c === '#34d399' ? '#065f46' : '#4c1d95'
      if (!d.text && !d.causes.length && !d.images.length) return ''
      return (
        `<div class="pdf-ishi-cat pdf-no-break">` +
        `<div class="pdf-ishi-cat-head" style="background:${printColor};">${cat.l}</div>` +
        `<div class="pdf-ishi-cat-body">` +
        (d.text ? `<div class="pdf-ishi-obs">${d.text}</div>` : '') +
        (d.causes.length ? `<ul class="pdf-ishi-causes">${d.causes.map(c => `<li style="color:${printColor};">● ${c}</li>`).join('')}</ul>` : '') +
        imgsHtml(d.images) + `</div></div>`
      )
    }).filter(Boolean).join('')

    const tlHtml = sorted.length
      ? sorted.map(ev => {
          const m = TYPE_META[ev.type] ?? TYPE_META.falla
          // Timeline print: use slightly darker versions of the dark-mode colors
          const printBg    = ev.type === 'falla' ? '#fef2f2' : ev.type === 'alarma' ? '#fff7ed' : ev.type === 'condicion' ? '#fffbeb' : ev.type === 'intervencion' ? '#eff6ff' : '#f5f3ff'
          const printColor = ev.type === 'falla' ? '#dc2626' : ev.type === 'alarma' ? '#ea580c' : ev.type === 'condicion' ? '#d97706' : ev.type === 'intervencion' ? '#2563eb' : '#7c3aed'
          return (
            `<div class="pdf-tl-item pdf-no-break" style="background:${printBg};border-left-color:${printColor};">` +
            `<div><div class="pdf-tl-type" style="color:${printColor};">${m.label}</div>` +
            `<div class="pdf-tl-time">${fmtDt(ev.dt)}</div>` +
            `<div class="pdf-tl-desc">${ev.desc || '—'}</div>` +
            (ev.resp ? `<div class="pdf-tl-resp">👤 ${ev.resp}</div>` : '') +
            `</div></div>`
          )
        }).join('')
      : '<p style="color:#94a3b8;font-size:9pt;">Sin eventos registrados</p>'

    const actionsHtml = ai?.acciones
      ? `<table class="pdf-actions-table"><thead><tr><th>#</th><th>Acción correctiva</th><th>Responsable</th><th>Plazo</th></tr></thead><tbody>` +
        ai.acciones.map((a, i) => `<tr><td style="text-align:center;font-weight:700;">${i + 1}</td><td>${a.descripcion}</td><td>${a.responsable}</td><td>${a.plazo}</td></tr>`).join('') +
        `</tbody></table>`
      : '<p style="color:#94a3b8;">Sin acciones generadas</p>'

    const riskPrintColor = ai?.riesgo === 'CRITICO' ? '#dc2626' : ai?.riesgo === 'ALTO' ? '#ea580c' : ai?.riesgo === 'MEDIO' ? '#d97706' : '#16a34a'

    pdfRef.current.innerHTML = `
      <div class="pdf-cover">
        <div class="pdf-cover-badge">KIRA Virtual Industry Assistant</div>
        <h1>Informe de Análisis<br/>de Causa Raíz</h1>
        <div class="cover-sub">${w2h.what || 'Evento analizado'}</div>
        <div class="pdf-cover-meta">
          <div class="meta-row"><span class="meta-label">N° Informe</span><span class="meta-val">${w2h.nro || 'RCA-' + new Date().getFullYear() + '-001'}</span></div>
          <div class="meta-row"><span class="meta-label">Equipo / Área</span><span class="meta-val">${w2h.where || '—'}</span></div>
          <div class="meta-row"><span class="meta-label">Fecha del evento</span><span class="meta-val">${w2h.when || '—'}</span></div>
          <div class="meta-row"><span class="meta-label">Fecha del informe</span><span class="meta-val">${today()}</span></div>
          <div class="meta-row"><span class="meta-label">Responsable</span><span class="meta-val">${w2h.responsable || '—'}</span></div>
        </div>
      </div>
      <div class="pdf-section pdf-page-break">
        <div class="pdf-section-title">1. Resumen Ejecutivo</div>
        <div class="pdf-body">El presente informe documenta la investigación de causa raíz del evento: <strong>${w2h.what || '—'}</strong>, ocurrido el <strong>${w2h.when || '—'}</strong> en <strong>${w2h.where || '—'}</strong>.${w2h.howmuch ? ` Impacto estimado: ${w2h.howmuch}.` : ''}</div>
      </div>
      <div class="pdf-section">
        <div class="pdf-section-title">2. Metodología</div>
        <div class="pdf-method-box">Análisis mediante <strong>5W2H + Ishikawa (9 categorías) + Inteligencia Artificial</strong>.</div>
      </div>
      <div class="pdf-section">
        <div class="pdf-section-title">3. Descripción del Evento — 5W2H</div>
        <table class="pdf-table"><thead><tr><th style="width:22%;">Pregunta</th><th>Respuesta</th></tr></thead><tbody>
          <tr><td><strong>¿Qué ocurrió?</strong></td><td>${w2h.what || '—'}</td></tr>
          <tr><td><strong>¿Quién?</strong></td><td>${w2h.who || '—'}</td></tr>
          <tr><td><strong>¿Dónde?</strong></td><td>${w2h.where || '—'}</td></tr>
          <tr><td><strong>¿Cuándo?</strong></td><td>${w2h.when || '—'}</td></tr>
          <tr><td><strong>¿Por qué? (inicial)</strong></td><td>${w2h.why || '—'}</td></tr>
          <tr><td><strong>¿Cómo?</strong></td><td>${w2h.how || '—'}</td></tr>
          <tr><td><strong>¿Cuánto impacto?</strong></td><td>${w2h.howmuch || '—'}</td></tr>
        </tbody></table>
      </div>
      <div class="pdf-section pdf-page-break">
        <div class="pdf-section-title">4. Línea de Tiempo</div>
        <div class="pdf-tl">${tlHtml}</div>
      </div>
      <div class="pdf-section pdf-page-break">
        <div class="pdf-section-title">5. Análisis Ishikawa — 9 Categorías</div>
        ${ishiSections || '<p style="color:#94a3b8;font-size:9pt;">Sin datos cargados</p>'}
      </div>
      <div class="pdf-section pdf-page-break">
        <div class="pdf-section-title">6. Análisis IA — Causa Raíz</div>
        ${ai
          ? `<div class="pdf-section-sub">Causa raíz identificada</div>
             <div class="pdf-body" style="background:#f8fafc;padding:10px 14px;border-radius:6px;font-weight:600;margin-bottom:12px;">${ai.causa_raiz || '—'}</div>
             <div class="pdf-section-sub">Causas contribuyentes</div>
             <ul style="padding-left:18px;margin-bottom:12px;">${(ai.causas_contribuyentes || []).map(c => `<li style="font-size:9.5pt;margin-bottom:4px;">${c}</li>`).join('')}</ul>
             <div class="pdf-section-sub">Riesgo residual</div>
             <p><span class="pdf-risk" style="background:${riskPrintColor};">${ai.riesgo}</span></p>
             <p class="pdf-body">${ai.riesgo_justificacion || ''}</p>`
          : '<p style="color:#94a3b8;">Sin análisis generado</p>'
        }
      </div>
      <div class="pdf-section"><div class="pdf-section-title">7. Acciones Correctivas</div>${actionsHtml}</div>
      <div class="pdf-section">
        <div class="pdf-section-title">8. Patrones a Monitorear</div>
        ${ai?.patrones ? `<ul style="padding-left:18px;">${ai.patrones.map(p => `<li style="font-size:9.5pt;margin-bottom:5px;">${p}</li>`).join('')}</ul>` : '<p style="color:#94a3b8;">—</p>'}
      </div>
      <div class="pdf-section">
        <div class="pdf-section-title">9. Insight del Inspector</div>
        <div class="pdf-insight">${inspData.text || 'Sin observaciones registradas.'}</div>
      </div>
      <div class="pdf-section">
        <div class="pdf-section-title">10. Conclusión Ejecutiva</div>
        <div class="pdf-conclusion">${ai ? ai.conclusion : 'Sin conclusión generada.'}</div>
      </div>
      <div class="pdf-section pdf-no-break" style="margin-top:32px;">
        <div class="pdf-section-title">11. Firmas</div>
        <div class="pdf-sigs">
          <div class="pdf-sig">Responsable del análisis<br/><br/>${w2h.responsable || '_____________________'}</div>
          <div class="pdf-sig">Inspector SSMA<br/><br/>_____________________</div>
          <div class="pdf-sig">Jefe de área<br/><br/>_____________________</div>
        </div>
      </div>
      <div style="margin-top:20px;text-align:center;font-size:7.5pt;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:10px;">
        KIRA Virtual Industry Assistant · ${today()} · ${w2h.nro || ''}
      </div>
    `
    setTimeout(() => window.print(), 200)
  }, [aiData, catData, inspData, w2h, sorted]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      {/* AI card */}
      <div style={aiCard}>
        {/* Header */}
        <div style={{ background: K.pageBg, padding: '16px 22px', color: K.textPri, display: 'flex', alignItems: 'center', gap: 12, borderBottom: `1px solid ${K.border}` }}>
          <span style={{ fontSize: 20 }}>🤖</span>
          <h2 style={{ fontSize: 16, fontWeight: 700, flex: 1, margin: 0, color: K.textPri }}>
            Análisis de Causa Raíz — IA
          </h2>
          <button onClick={onBack} style={btnSm}>← Ishikawa</button>
        </div>

        {/* Body */}
        <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '40px 0' }}>
              <div style={{ width: 44, height: 44, border: `4px solid ${K.surfaceBg}`, borderTopColor: K.accent, borderRadius: '50%', animation: 'rca-spin 1s linear infinite' }} />
              <p style={{ fontSize: 14, color: K.textSec }}>Analizando causas...</p>
            </div>
          )}

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: 16, color: '#fca5a5', fontSize: 13 }}>
              <strong>Error:</strong> {error}
            </div>
          )}

          {aiData && !loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <ResultBlock
                headerBg={RISK_COLOR[aiData.riesgo] ?? K.textMut}
                headerColor="#fff"
                title="🎯 Causa Raíz Identificada"
              >
                <p style={{ fontWeight: 600, fontSize: 14, margin: 0, color: K.textPri }}>{aiData.causa_raiz}</p>
              </ResultBlock>

              <ResultBlock title="⚠️ Causas Contribuyentes">
                <ul style={{ paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4, margin: 0, color: K.textSec }}>
                  {aiData.causas_contribuyentes.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
              </ResultBlock>

              <ResultBlock title="🔴 Riesgo Residual">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ display: 'inline-block', borderRadius: 20, padding: '3px 14px', fontSize: 12, fontWeight: 700, color: '#fff', background: RISK_COLOR[aiData.riesgo] ?? K.textMut }}>
                    {aiData.riesgo}
                  </span>
                  <span style={{ color: K.textSec }}>{aiData.riesgo_justificacion}</span>
                </div>
              </ResultBlock>

              <ResultBlock title="✅ Acciones Correctivas">
                {aiData.acciones.map((a, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '7px 0', borderBottom: `1px solid ${K.surfaceBg}` }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: K.accent, color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {i + 1}
                    </div>
                    <div>
                      <div style={{ color: K.textPri }}>{a.descripcion}</div>
                      <div style={{ fontSize: 11, color: K.textSec, marginTop: 2 }}>👤 {a.responsable} · ⏱ {a.plazo}</div>
                    </div>
                  </div>
                ))}
              </ResultBlock>

              <ResultBlock title="📊 Patrones a Monitorear">
                <ul style={{ paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4, margin: 0, color: K.textSec }}>
                  {aiData.patrones.map((p, i) => <li key={i}>{p}</li>)}
                </ul>
              </ResultBlock>

              <ResultBlock title="📋 Conclusión Ejecutiva" headerBg={K.pageBg} headerColor={K.accentLt}>
                <p style={{ fontStyle: 'italic', margin: 0, color: K.textSec }}>{aiData.conclusion}</p>
              </ResultBlock>
            </div>
          )}

          {/* Timeline */}
          {(aiData || error) && (
            <div style={{ borderRadius: 12, border: `1px solid ${K.border}`, overflow: 'hidden' }}>
              <div style={{ background: K.pageBg, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid ${K.border}` }}>
                <span style={{ fontSize: 16 }}>⏱</span>
                <h3 style={{ color: K.textPri, fontSize: 14, fontWeight: 700, flex: 1, margin: 0 }}>
                  Línea de Tiempo del Evento
                </h3>
                <button
                  onClick={() => { setShowForm(f => !f); setEditId(null); setEvForm({ dt: '', type: 'condicion', desc: '', resp: '' }) }}
                  style={btnSm}
                >
                  {showForm ? '✕ Cancelar' : '+ Agregar evento'}
                </button>
              </div>
              <div style={{ padding: 18 }}>
                {showForm && (
                  <div style={{ background: K.surfaceBg, borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', gap: 10, border: `1px solid ${K.border}`, marginBottom: 16 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div>
                        <label style={evLabel}>Fecha y hora</label>
                        <input type="datetime-local" value={evForm.dt}
                          onChange={e => setEvForm(f => ({ ...f, dt: e.target.value }))} style={evInput} />
                      </div>
                      <div>
                        <label style={evLabel}>Tipo</label>
                        <select value={evForm.type} onChange={e => setEvForm(f => ({ ...f, type: e.target.value }))} style={evInput}>
                          <option value="condicion">Condición previa</option>
                          <option value="falla">Falla</option>
                          <option value="alarma">Alarma / Alerta</option>
                          <option value="intervencion">Intervención</option>
                          <option value="consecuencia">Consecuencia</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label style={evLabel}>Descripción</label>
                      <textarea rows={2} placeholder="¿Qué ocurrió?" value={evForm.desc}
                        onChange={e => setEvForm(f => ({ ...f, desc: e.target.value }))}
                        style={{ ...evInput, width: '100%', resize: 'vertical' }} />
                    </div>
                    <div>
                      <label style={evLabel}>Responsable</label>
                      <input type="text" placeholder="Operador, turno..." value={evForm.resp}
                        onChange={e => setEvForm(f => ({ ...f, resp: e.target.value }))} style={evInput} />
                    </div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button onClick={() => { setShowForm(false); setEditId(null) }} style={btnSm}>Cancelar</button>
                      <button onClick={saveEvent} style={btnPrimary}>Guardar</button>
                    </div>
                  </div>
                )}

                {sorted.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 20, color: K.textMut, fontSize: 13 }}>
                    Sin eventos — agregá el primero
                  </div>
                ) : (
                  <div style={{ position: 'relative', paddingBottom: 24, paddingTop: 8 }}>
                    {/* Axis */}
                    <div style={{ position: 'absolute', top: 36, left: 24, right: 24, height: 3, background: `linear-gradient(90deg,${K.accent},${K.purple})`, borderRadius: 2 }} />
                    {/* Nodes */}
                    <div style={{ display: 'flex', position: 'relative', zIndex: 1, overflowX: 'auto', paddingBottom: 4 }}>
                      {sorted.map((ev, i) => {
                        const m = TYPE_META[ev.type] ?? TYPE_META.falla
                        return (
                          <div key={ev.id} draggable
                            onDragStart={() => setDragSrc(i)}
                            onDragOver={e => e.preventDefault()}
                            onDrop={() => handleDrop(i)}
                            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 130, flex: 1, cursor: 'grab', userSelect: 'none', opacity: dragSrc === i ? 0.45 : 1 }}
                          >
                            <div style={{ marginBottom: 6 }}>
                              <div style={{ width: 18, height: 18, borderRadius: '50%', border: `3px solid ${K.pageBg}`, boxShadow: `0 0 0 2px ${m.color}`, background: m.color }} />
                            </div>
                            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', margin: '6px 0 2px', textAlign: 'center', color: m.color }}>
                              {m.label}
                            </div>
                            <div style={{ fontSize: 10, color: K.textMut, textAlign: 'center', marginBottom: 4 }}>{fmtDt(ev.dt)}</div>
                            <div style={{ fontSize: 11, color: K.textSec, textAlign: 'center', lineHeight: 1.3, maxWidth: 120 }}>{ev.desc || '—'}</div>
                            {ev.resp && <div style={{ fontSize: 10, color: K.textMut, textAlign: 'center', marginTop: 3 }}>👤 {ev.resp}</div>}
                            <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                              <button onClick={() => editEvent(ev)} style={tlBtn}>✏️</button>
                              <button onClick={() => deleteEvent(ev.id)} style={tlBtn}>🗑</button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {(aiData || error) && (
          <div style={{ padding: '14px 22px', borderTop: `1px solid ${K.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button onClick={runAI} style={btnGhost}>↺ Regenerar</button>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {/* Save button */}
              <button
                onClick={saveAnalysis}
                disabled={saveStatus === 'saving'}
                style={{
                  ...btnGhost,
                  borderColor:
                    saveStatus === 'saved'  ? '#34d399' :
                    saveStatus === 'error'  ? '#ef4444' : '#0ea5e9',
                  color:
                    saveStatus === 'saved'  ? '#34d399' :
                    saveStatus === 'error'  ? '#ef4444' : '#0ea5e9',
                  opacity: saveStatus === 'saving' ? 0.6 : 1,
                }}
              >
                {saveStatus === 'saving' ? '⏳ Guardando...' :
                 saveStatus === 'saved'  ? '✓ Guardado' :
                 saveStatus === 'error'  ? '✕ Error' :
                 analysisId              ? '💾 Actualizar' : '💾 Guardar análisis'}
              </button>
              <button onClick={generatePDF} style={btnPrimary}>📄 Generar informe PDF</button>
            </div>
          </div>
        )}
      </div>

      {/* Hidden PDF target */}
      <div ref={pdfRef} id="rca-pdf-report" style={{ display: 'none' }} />

      <style>{`@keyframes rca-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ResultBlock({
  title,
  headerBg = '#1e293b',
  headerColor = '#94a3b8',
  children,
}: {
  title: string; headerBg?: string; headerColor?: string; children: React.ReactNode
}) {
  return (
    <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid #334155' }}>
      <div style={{ padding: '9px 14px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', background: headerBg, color: headerColor }}>
        {title}
      </div>
      <div style={{ padding: '11px 14px', fontSize: 13, lineHeight: 1.65, color: '#94a3b8', background: '#020617' }}>
        {children}
      </div>
    </div>
  )
}

// ─── Inline styles ────────────────────────────────────────────────────────────

const aiCard: React.CSSProperties = {
  background: '#0f172a', border: '1px solid #334155',
  borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,.4)',
  width: '100%', maxWidth: 760, overflow: 'hidden',
}
const btnSm: React.CSSProperties = {
  fontSize: 12, padding: '5px 14px', borderRadius: 6,
  border: '1px solid #334155', background: '#1e293b',
  cursor: 'pointer', color: '#94a3b8',
}
const btnPrimary: React.CSSProperties = {
  fontSize: 13, padding: '8px 20px', borderRadius: 8, border: 'none',
  cursor: 'pointer', fontWeight: 600, background: '#0ea5e9', color: '#fff',
}
const btnGhost: React.CSSProperties = {
  fontSize: 13, padding: '8px 20px', borderRadius: 8,
  cursor: 'pointer', fontWeight: 600, background: 'transparent',
  color: '#0ea5e9', border: '1.5px solid #0ea5e9',
}
const tlBtn: React.CSSProperties = {
  background: 'none', border: '1px solid #334155',
  borderRadius: 4, padding: '2px 6px', fontSize: 10, cursor: 'pointer', color: '#64748b',
}
const evLabel: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, color: '#64748b',
  textTransform: 'uppercase', letterSpacing: '.04em', display: 'block', marginBottom: 3,
}
const evInput: React.CSSProperties = {
  width: '100%', padding: '7px 9px',
  background: '#020617', border: '1px solid #334155',
  borderRadius: 6, fontSize: 12, fontFamily: 'inherit',
  color: '#f1f5f9',
}

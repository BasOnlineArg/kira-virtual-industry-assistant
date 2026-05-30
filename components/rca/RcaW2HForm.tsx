'use client'

import { useState } from 'react'
import type { W2HData } from './types'

// ─── KIRA palette tokens ──────────────────────────────────────────────────────
const C = {
  pageBg:    '#020617',  // slate-950
  cardBg:    '#0f172a',  // slate-900
  surfaceBg: '#1e293b',  // slate-800
  border:    '#334155',  // slate-700
  accent:    '#0ea5e9',  // sky-500
  accentDk:  '#0284c7',  // sky-600 (hover)
  textPri:   '#f1f5f9',  // slate-100
  textSec:   '#94a3b8',  // slate-400
  textMut:   '#64748b',  // slate-500
}

interface Props {
  w2h:      W2HData
  onSubmit: (data: W2HData) => void
}

export default function RcaW2HForm({ w2h, onSubmit }: Props) {
  const [form, setForm] = useState<W2HData>(w2h)

  const set = (k: keyof W2HData) =>
    (e: React.ChangeEvent<HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))

  function handleSubmit() {
    const { what, who, where, when, how } = form
    if (!what.trim() || !who.trim() || !where.trim() || !when.trim() || !how.trim()) {
      alert('Completá los campos obligatorios (*)')
      return
    }
    onSubmit(form)
  }

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <div style={card}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #0c4a6e 0%, #0369a1 100%)',
          padding: '18px 26px',
          borderBottom: `1px solid ${C.border}`,
        }}>
          <h1 style={{ fontSize: 19, fontWeight: 800, margin: 0, color: C.textPri }}>
            🔍 Análisis de Causa Raíz
          </h1>
          <p style={{ fontSize: 12, color: C.textSec, margin: '3px 0 0' }}>
            Sinergy Consultant — HSEyQ · Patagonia, Argentina
          </p>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 26px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Field label="¿Qué ocurrió?" required>
            <textarea
              rows={3}
              placeholder="Describí el evento, falla o no conformidad..."
              value={form.what}
              onChange={set('what')}
              style={ta}
            />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="¿Quién?" required>
              <textarea rows={2} placeholder="Operador, turno, área..." value={form.who} onChange={set('who')} style={ta} />
            </Field>
            <Field label="¿Dónde?" required>
              <textarea rows={2} placeholder="Equipo, área, nivel..." value={form.where} onChange={set('where')} style={ta} />
            </Field>
            <Field label="¿Cuándo?" required>
              <textarea rows={2} placeholder="Fecha, hora, turno..." value={form.when} onChange={set('when')} style={ta} />
            </Field>
            <Field label="¿Por qué? (inicial)">
              <textarea rows={2} placeholder="Causa aparente..." value={form.why} onChange={set('why')} style={ta} />
            </Field>
            <Field label="¿Cómo?" required>
              <textarea rows={2} placeholder="Secuencia de eventos..." value={form.how} onChange={set('how')} style={ta} />
            </Field>
            <Field label="¿Cuánto impacto?">
              <textarea rows={2} placeholder="Costo, horas perdidas..." value={form.howmuch} onChange={set('howmuch')} style={ta} />
            </Field>
            <Field label="Responsable del análisis">
              <textarea rows={1} placeholder="Nombre y cargo..." value={form.responsable} onChange={set('responsable')} style={ta} />
            </Field>
            <Field label="Número de informe">
              <textarea rows={1} placeholder="RCA-2025-001..." value={form.nro} onChange={set('nro')} style={ta} />
            </Field>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 26px', borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={handleSubmit} style={btnPrimary}>
            Continuar al Ishikawa →
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label style={{
        display: 'block', fontSize: 10, fontWeight: 700,
        color: '#64748b', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4,
      }}>
        {label}{required && <span style={{ color: '#f87171' }}> *</span>}
      </label>
      {children}
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: '#0f172a',
  border: '1px solid #334155',
  borderRadius: 16,
  boxShadow: '0 4px 24px rgba(0,0,0,.4)',
  width: '100%', maxWidth: 640, overflow: 'hidden',
}

const ta: React.CSSProperties = {
  width: '100%', padding: '8px 10px',
  background: '#1e293b',
  border: '1px solid #334155',
  borderRadius: 7,
  fontSize: 13, fontFamily: 'inherit', resize: 'vertical',
  color: '#f1f5f9',
  outline: 'none',
}

const btnPrimary: React.CSSProperties = {
  fontSize: 13, padding: '8px 20px', borderRadius: 8, border: 'none',
  cursor: 'pointer', fontWeight: 600, background: '#0ea5e9', color: '#fff',
}

'use client'

import { useEffect, useState } from 'react'

// ─── KIRA palette ─────────────────────────────────────────────────────────────
const K = {
  pageBg:    '#020617',
  cardBg:    '#0f172a',
  surfaceBg: '#1e293b',
  border:    '#334155',
  accent:    '#0ea5e9',
  textPri:   '#f1f5f9',
  textSec:   '#94a3b8',
  textMut:   '#64748b',
}

const RISK_COLOR: Record<string, string> = {
  CRITICO: '#ef4444',
  ALTO:    '#f97316',
  MEDIO:   '#f59e0b',
  BAJO:    '#22c55e',
}

interface HistoryItem {
  id:         string
  created_at: string
  updated_at: string
  title:      string
  nro:        string
  ai_result:  { riesgo?: string } | null
}

interface Props {
  onLoad:  (id: string) => void
  onClose: () => void
}

function fmtDate(dt: string) {
  return new Date(dt).toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function RcaHistory({ onLoad, onClose }: Props) {
  const [items,    setItems]    = useState<HistoryItem[]>([])
  const [loading,  setLoading]  = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error,    setError]    = useState('')

  useEffect(() => {
    fetch('/api/rca')
      .then(r => r.json())
      .then(d => { setItems(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => { setError('Error al cargar historial'); setLoading(false) })
  }, [])

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm('¿Eliminar este análisis? Esta acción no se puede deshacer.')) return
    setDeleting(id)
    try {
      await fetch(`/api/rca/${id}`, { method: 'DELETE' })
      setItems(prev => prev.filter(i => i.id !== id))
    } catch {
      alert('Error al eliminar')
    } finally {
      setDeleting(null)
    }
  }

  return (
    /* Overlay */
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(2,6,23,0.75)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end',
      }}
    >
      {/* Panel */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 420, height: '100vh', overflowY: 'auto',
          background: K.cardBg, borderLeft: `1px solid ${K.border}`,
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 10,
          background: K.cardBg, borderBottom: `1px solid ${K.border}`,
          padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 16 }}>📂</span>
          <h2 style={{ flex: 1, margin: 0, fontSize: 15, fontWeight: 700, color: K.textPri }}>
            Historial de análisis
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: `1px solid ${K.border}`,
              borderRadius: 6, padding: '4px 10px', cursor: 'pointer',
              fontSize: 12, color: K.textSec,
            }}
          >
            ✕ Cerrar
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: 40, color: K.textMut }}>
              <div style={{
                width: 32, height: 32, border: `3px solid ${K.surfaceBg}`,
                borderTopColor: K.accent, borderRadius: '50%',
                animation: 'rca-spin 1s linear infinite',
                margin: '0 auto 12px',
              }} />
              Cargando...
            </div>
          )}

          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 8, padding: 14, color: '#fca5a5', fontSize: 13,
            }}>
              {error}
            </div>
          )}

          {!loading && !error && items.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: K.textMut, fontSize: 13 }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
              No hay análisis guardados aún.
            </div>
          )}

          {items.map(item => {
            const riesgo    = item.ai_result?.riesgo
            const riskColor = riesgo ? (RISK_COLOR[riesgo] ?? K.textMut) : null
            const isDel     = deleting === item.id

            return (
              <div
                key={item.id}
                onClick={() => onLoad(item.id)}
                style={{
                  background: K.surfaceBg, border: `1px solid ${K.border}`,
                  borderRadius: 10, padding: '12px 14px',
                  cursor: 'pointer', transition: 'border-color .15s',
                  display: 'flex', flexDirection: 'column', gap: 6,
                  opacity: isDel ? 0.4 : 1,
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = K.accent)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = K.border)}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 13, fontWeight: 600, color: K.textPri,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {item.title || 'Análisis sin título'}
                    </div>
                    {item.nro && (
                      <div style={{ fontSize: 11, color: K.textMut, marginTop: 2 }}>
                        {item.nro}
                      </div>
                    )}
                  </div>

                  {riskColor && (
                    <span style={{
                      flexShrink: 0, background: riskColor + '20',
                      color: riskColor, border: `1px solid ${riskColor}40`,
                      borderRadius: 20, padding: '2px 8px', fontSize: 10, fontWeight: 700,
                    }}>
                      {riesgo}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 10, color: K.textMut }}>
                    Guardado {fmtDate(item.updated_at)}
                  </span>
                  <button
                    onClick={e => handleDelete(item.id, e)}
                    disabled={isDel}
                    style={{
                      background: 'none', border: '1px solid rgba(239,68,68,0.25)',
                      borderRadius: 4, padding: '2px 8px', fontSize: 10,
                      cursor: 'pointer', color: '#ef4444', opacity: isDel ? 0.5 : 1,
                    }}
                  >
                    {isDel ? '...' : '🗑 Eliminar'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <style>{`@keyframes rca-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

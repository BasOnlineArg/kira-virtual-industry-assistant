// ─── RCA module constants ──────────────────────────────────────────────────────

export interface CatMeta {
  s:  string  // short label (canvas badge)
  l:  string  // long label (modal title, PDF)
  c:  string  // hex color (dark-mode visible)
  b:  number  // branch position index 0-2 (maps to BX positions)
  sk: number  // spoke group index 0-2
}

/** 9 Ishikawa categories — 3 groups of 3 on 3 axis spokes
 *  Colors aligned with KIRA palette: sky-400 / emerald-400 / violet-400 */
export const CATS: CatMeta[] = [
  { s: 'M.Obra',   l: 'Mano de obra', c: '#38bdf8', b: 0, sk: 0 }, // sky-400
  { s: 'Máquina',  l: 'Máquina',      c: '#38bdf8', b: 1, sk: 0 },
  { s: 'Método',   l: 'Método',       c: '#38bdf8', b: 2, sk: 0 },
  { s: 'Material', l: 'Material',     c: '#34d399', b: 0, sk: 1 }, // emerald-400
  { s: 'Medio',    l: 'Medio amb.',   c: '#34d399', b: 1, sk: 1 },
  { s: 'Gestión',  l: 'Gestión',      c: '#34d399', b: 2, sk: 1 },
  { s: 'Medición', l: 'Medición',     c: '#a78bfa', b: 0, sk: 2 }, // violet-400
  { s: 'Proceso',  l: 'Proceso',      c: '#a78bfa', b: 1, sk: 2 },
  { s: 'Entorno',  l: 'Entorno',      c: '#a78bfa', b: 2, sk: 2 },
]

/** Guiding questions per category index */
export const QUESTIONS: Record<number, string[]> = {
  0: ['¿Está el personal capacitado?', '¿Hay fatiga o falta de motivación?', '¿Se siguen las instrucciones?', '¿Existe supervisión adecuada?'],
  1: ['¿Las máquinas están en buen estado?', '¿Son adecuadas para la tarea?', '¿Se requiere mantenimiento?', '¿Hay fallas recurrentes?'],
  2: ['¿El procedimiento está documentado?', '¿Existen pasos innecesarios?', '¿Se aplica el método correcto?', '¿Se siguen los estándares?'],
  3: ['¿Los materiales son de calidad requerida?', '¿Hay retrasos en el suministro?', '¿Se manipulan correctamente?', '¿Las especificaciones son adecuadas?'],
  4: ['¿Hay condiciones ambientales adversas?', '¿Existen factores externos que afecten?', '¿Las condiciones son seguras?', '¿Hay contaminación?'],
  5: ['¿Los instrumentos están calibrados?', '¿Las métricas son correctas?', '¿Los registros son confiables?', '¿Se verifican los resultados?'],
  6: ['¿Los procesos están bien definidos?', '¿Hay cuellos de botella?', '¿La información fluye entre turnos?', '¿Las interfaces están controladas?'],
  7: ['¿Las decisiones favorecen seguridad?', '¿Se asignan recursos suficientes?', '¿Hay presiones que comprometan calidad?', '¿Existe plan preventivo?'],
  8: ['¿El entorno apoya buenas prácticas?', '¿Existe cultura de reporte de fallas?', '¿Las relaciones con contratistas están definidas?', '¿Hay presiones externas?'],
}

export interface TypeMeta {
  label: string
  color: string
  bg:    string
}

/** Timeline event type metadata — dark-mode semi-transparent backgrounds */
export const TYPE_META: Record<string, TypeMeta> = {
  falla:        { label: 'Falla',        color: '#f87171', bg: 'rgba(239,68,68,0.12)'    }, // red-400
  alarma:       { label: 'Alarma',       color: '#fb923c', bg: 'rgba(249,115,22,0.12)'   }, // orange-400
  condicion:    { label: 'Condición',    color: '#fbbf24', bg: 'rgba(245,158,11,0.12)'   }, // amber-400
  intervencion: { label: 'Intervención', color: '#38bdf8', bg: 'rgba(56,189,248,0.12)'   }, // sky-400
  consecuencia: { label: 'Consecuencia', color: '#a78bfa', bg: 'rgba(167,139,250,0.12)'  }, // violet-400
}

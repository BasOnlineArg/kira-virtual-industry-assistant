// ─── RCA module constants ──────────────────────────────────────────────────────

export interface CatMeta {
  s:  string  // short label (canvas badge)
  l:  string  // long label (modal title, PDF)
  c:  string  // hex color
  b:  number  // branch position index 0-2 (maps to BX positions)
  sk: number  // spoke group index 0-2
}

/** 9 Ishikawa categories — 3 groups of 3 on 3 axis spokes */
export const CATS: CatMeta[] = [
  { s: 'M.Obra',   l: 'Mano de obra', c: '#185FA5', b: 0, sk: 0 },
  { s: 'Máquina',  l: 'Máquina',      c: '#185FA5', b: 1, sk: 0 },
  { s: 'Método',   l: 'Método',       c: '#185FA5', b: 2, sk: 0 },
  { s: 'Material', l: 'Material',     c: '#0F6E56', b: 0, sk: 1 },
  { s: 'Medio',    l: 'Medio amb.',   c: '#0F6E56', b: 1, sk: 1 },
  { s: 'Gestión',  l: 'Gestión',      c: '#0F6E56', b: 2, sk: 1 },
  { s: 'Medición', l: 'Medición',     c: '#7c3aed', b: 0, sk: 2 },
  { s: 'Proceso',  l: 'Proceso',      c: '#7c3aed', b: 1, sk: 2 },
  { s: 'Entorno',  l: 'Entorno',      c: '#7c3aed', b: 2, sk: 2 },
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

/** Timeline event type metadata */
export const TYPE_META: Record<string, TypeMeta> = {
  falla:        { label: 'Falla',        color: '#dc2626', bg: '#fef2f2' },
  alarma:       { label: 'Alarma',       color: '#ea580c', bg: '#fff7ed' },
  condicion:    { label: 'Condición',    color: '#d97706', bg: '#fffbeb' },
  intervencion: { label: 'Intervención', color: '#2563eb', bg: '#eff6ff' },
  consecuencia: { label: 'Consecuencia', color: '#7c3aed', bg: '#f5f3ff' },
}

// ─── User & Auth ────────────────────────────────────────────────────────────

export type UserRole = 'superusuario' | 'inspector' | 'supervisor'

export interface KiraUser {
  id: string
  email: string
  name: string
  role: UserRole
  active: boolean
  created_at: string
}

// ─── Assets ─────────────────────────────────────────────────────────────────
// Fuente de verdad: lib/geo/types.ts (Asset matchea exactamente el schema de la DB)

export type { Asset, AssetStatus } from '@/lib/geo/types'

// ─── Inspections ─────────────────────────────────────────────────────────────

export type InspectionType = 'rutina' | 'preventiva' | 'correctiva' | 'predictiva' | 'emergencia'
export type ChecklistResult = 'ok' | 'observacion' | 'falla'

export interface Inspection {
  id: string
  asset_id: string | null
  tipo: InspectionType
  inspector_id: string | null
  fecha: string
  estado_general: string | null
  score: number | null
  notas: string | null
  created_at: string
}

/** Ítem de checklist persistido en DB (tabla inspection_checklist_items) */
export interface InspectionChecklistItem {
  id: string
  inspection_id: string
  asset_id: string | null
  descripcion: string
  resultado: ChecklistResult | null
  nota: string | null
  foto_url: string | null
  created_at: string
}

// ─── Analysis Modules ────────────────────────────────────────────────────────

export type Severity = 'ALTA' | 'MEDIA' | 'BAJA'

export interface VisualAnalysis {
  id: string
  asset_id: string | null
  inspector_id: string | null
  fecha: string
  severidad: Severity | null
  diagnostico: string | null
  base_metodologica: string | null
  recomendaciones: string | null
  foto_url: string | null
  created_at: string
}

export interface AudioAnalysis {
  id: string
  asset_id: string | null
  inspector_id: string | null
  fecha: string
  rms: number | null
  kurtosis: number | null
  peak_freq: number | null
  falla_prob: number | null
  rul: string | null
  diagnostico: string | null
  tipo_equipo: string | null
  created_at: string
}

export type IsoClass = 'I' | 'II' | 'III' | 'IV'
export type SkfStatus = 'verde' | 'amarillo' | 'rojo'

export interface SkfMeasurement {
  id: string
  asset_id: string | null
  inspector_id: string | null
  fecha: string
  velocity_rms: number | null
  envelope_ge: number | null
  temperatura: number | null
  iso_class: IsoClass | null
  estado: SkfStatus | null
  diagnostico: string | null
  created_at: string
}

// ─── Work Orders & Notices ───────────────────────────────────────────────────
// Shapes reflejan la respuesta del cliente de la API (camelCase, post-mapping)

export type WorkOrderStatus = 'en_proceso' | 'cumplida' | 'anulada' | 'reprogramada'

/** Forma que devuelve GET /api/work-orders (después del dbToClient mapping) */
export interface WorkOrder {
  id: string
  otNumber: string
  description: string
  date: string | null
  isoWeek: number | null
  isoYear: number | null
  hhProg: number
  hhr: number
  status: WorkOrderStatus
  observations: string | null
  createdAt: string
  updatedAt: string
}

export type NoticePriority = 'MN' | 'MI' | 'BKL' | 'PP'

/** Forma que devuelve GET /api/notices (después del dbToClient mapping) */
export interface Notice {
  id: string
  fecha: string
  isoWeek: number | null
  isoYear: number | null
  prioridad: NoticePriority
  tag: string | null
  ejecutante: string | null
  descripcion: string | null
  generadoSAP: boolean
  createdAt: string
}

// ─── Research & Manuals ──────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ResearchSession {
  id: string
  user_id: string
  titulo: string
  messages: ChatMessage[]
  created_at: string
  updated_at: string
}

export interface Manual {
  id: string
  nombre: string
  tipo: 'oem' | 'pauta_mantenimiento' | null
  categoria_equipo: string | null
  oem: string | null
  file_url: string | null
  created_at: string
}

// ─── Audit ───────────────────────────────────────────────────────────────────

/** Forma que devuelve GET /api/admin/audit-logs (matchea exactamente la tabla audit_logs) */
export interface AuditLog {
  id: string
  user_id: string | null
  user_email: string
  action: string
  module: string
  entity_id: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

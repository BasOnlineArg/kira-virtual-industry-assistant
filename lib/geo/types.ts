export interface ChecklistItem {
  descripcion: string
  resultado: boolean
  nota?: string
}

export interface HistorialItem {
  fecha: string
  texto: string
  estado: 'ok' | 'warn'
}

export type AssetStatus = 'Operativo' | 'En mantenimiento' | 'Fuera de servicio'

export interface Asset {
  id: string
  tag: string
  nombre: string
  tipo: string
  capa: 'superficie' | 'subterraneo'
  sector: string
  mina?: string | null
  lat?: number | null
  lng?: number | null
  ug_x?: number | null
  ug_y?: number | null
  status: AssetStatus
  estado?: string | null
  ubicacion?: string | null
  inspector_asignado?: string | null
  ultima_inspeccion?: string | null
  proxima_inspeccion?: string | null
  notas?: string | null
  // Campos del Registro Maestro SAP (migración 011)
  ub_tecnica?: string | null
  ubicacion_fisica?: string | null
  ruta_zona?: string | null
  frec_sem?: number | null
  hh_ocurr?: number | null
  hh_anual?: number | null
  // Timestamps
  created_at?: string
  updated_at?: string
  // Datos enriquecidos (no persisten en DB — solo mock/panel)
  checklist?: ChecklistItem[]
  historial?: HistorialItem[]
}

export type Capa = 'superficie' | 'subterraneo'
export type MineId = 'mariana_central' | 'mariana_norte' | 'emilia' | 'san_marcos'

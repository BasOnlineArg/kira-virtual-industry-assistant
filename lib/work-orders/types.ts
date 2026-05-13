export type OtStatus = 'en_proceso' | 'cumplida' | 'anulada' | 'reprogramada'

export interface WorkOrder {
  id: string          // uuid interno
  otNumber: string    // 8 dígitos SAP
  description: string
  date: string        // YYYY-MM-DD
  isoWeek: number     // calculado automáticamente
  isoYear: number
  hhProg: number      // horas programadas
  hhr: number         // horas reales
  status: OtStatus
  observations: string
  createdAt: string
  updatedAt: string
}

export const STATUS_CONFIG: Record<OtStatus, {
  label: string
  color: string
  bg: string
  border: string
  row: string
}> = {
  en_proceso:   {
    label: 'En proceso',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    row: 'border-l-blue-500',
  },
  cumplida:     {
    label: 'Cumplida',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    row: 'border-l-emerald-500',
  },
  anulada:      {
    label: 'Anulada',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    row: 'border-l-red-500',
  },
  reprogramada: {
    label: 'Reprogramada',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    row: 'border-l-amber-500',
  },
}

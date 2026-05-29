// ─── RCA module types (new redesign) ──────────────────────────────────────────

export interface W2HData {
  what:        string
  who:         string
  where:       string
  when:        string
  why:         string
  how:         string
  howmuch:     string
  responsable: string
  nro:         string
}

/** One image stored in canvas data: object URL + loaded HTMLImageElement */
export interface CanvasImage {
  src: string
  el:  HTMLImageElement
}

/** Data for one Ishikawa category */
export interface CatData {
  text:   string          // observations textarea
  causes: string[]        // list of identified causes
  images: CanvasImage[]   // attached photo evidence
}

export interface InspData {
  text:   string
  images: CanvasImage[]
}

export interface ProbData {
  w2h:    Partial<W2HData>
  images: CanvasImage[]
}

export type TLEventType =
  | 'condicion'
  | 'falla'
  | 'alarma'
  | 'intervencion'
  | 'consecuencia'

export interface TLEvent {
  id:   string
  dt:   string
  type: TLEventType
  desc: string
  resp: string
}

export interface AiAction {
  descripcion: string
  responsable: string
  plazo:       string
}

export interface AiResult {
  causa_raiz:            string
  causas_contribuyentes: string[]
  riesgo:                'CRITICO' | 'ALTO' | 'MEDIO' | 'BAJO'
  riesgo_justificacion:  string
  acciones:              AiAction[]
  patrones:              string[]
  conclusion:            string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const EMPTY_W2H: W2HData = {
  what: '', who: '', where: '', when: '',
  why: '', how: '', howmuch: '', responsable: '', nro: '',
}

export function emptyCatData(): CatData {
  return { text: '', causes: [], images: [] }
}

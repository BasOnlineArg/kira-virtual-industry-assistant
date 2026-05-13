import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// ─── ISO 10816 thresholds (velocity RMS mm/s) ─────────────────────────────────
const ISO_THRESHOLDS: Record<string, [number, number, number]> = {
  I:   [1.12, 2.8,  7.1],
  II:  [2.8,  7.1,  18],
  III: [4.5,  11.2, 28],
  IV:  [7.1,  18,   45],
}

export function isoZone(v: number, cls: string): { zone: 'A' | 'B' | 'C' | 'D'; estado: 'verde' | 'amarillo' | 'rojo' } {
  const [ab, bc, cd] = ISO_THRESHOLDS[cls] ?? ISO_THRESHOLDS['II']
  if (v <= ab) return { zone: 'A', estado: 'verde' }
  if (v <= bc) return { zone: 'B', estado: 'amarillo' }
  if (v <= cd) return { zone: 'C', estado: 'rojo' }
  return { zone: 'D', estado: 'rojo' }
}

const SKF_SYSTEM_PROMPT = `Sos KIRA, experto en análisis de vibraciones mecánicas y diagnóstico de equipos industriales para operaciones mineras en Patagonia, Argentina.

Recibís mediciones del colector de datos SKF QuickCollect (uno o múltiples puntos de medición) y las evaluás según norma ISO 10816.
Si se adjunta el informe PDF de QuickCollect, usalo para enriquecer el diagnóstico con información adicional.

Devolvé SIEMPRE y ÚNICAMENTE un JSON válido sin texto adicional:
{
  "diagnostico": "descripción técnica completa del estado del equipo considerando todos los puntos de medición",
  "probabilidad_falla": 35,
  "rul": "6-12 meses",
  "patron_falla": "tipo y descripción del patrón detectado, indicando el punto más crítico",
  "recomendaciones": "acciones concretas priorizadas"
}

Criterios ISO 10816:
- Zona A (verde): equipo nuevo, operación aceptable
- Zona B (amarillo): operación continua aceptable
- Zona C (rojo): operación no recomendada a largo plazo — planificar mantenimiento
- Zona D (rojo crítico): vibración severa que puede causar daño — intervención urgente

Interpretación envolvente gE:
- <0.5 gE: sin actividad de rodamiento
- 0.5–1.0 gE: actividad incipiente
- 1.0–5.0 gE: falla en desarrollo
- >5.0 gE: falla avanzada — reemplazar rodamiento

Temperatura: Δ >15°C sobre ambiente indica sobrecalentamiento. >80°C riesgo de falla.

Cuando hay múltiples puntos, indicá cuál es el más crítico y qué significa en conjunto.
Respondé en español argentino técnico.`

interface SkfPoint {
  punto: string
  velocityRms: number
  envelopeGe: number
  temperatura: number
  fecha?: string
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { data: userData } = await supabase
    .from('users').select('id, name').eq('id', user.id).single()

  let body: {
    tag: string
    tipoEquipo?: string
    isoClass: string
    observaciones?: string
    points: SkfPoint[]
    pdfBase64?: string | null
    fecha?: string
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
  }

  const { tag, tipoEquipo, isoClass, observaciones, points, pdfBase64, fecha } = body

  if (!tag || !isoClass || !points?.length) {
    return NextResponse.json({ error: 'TAG, clase ISO y puntos de medición son requeridos' }, { status: 400 })
  }

  // Worst point for DB record
  const worstPoint = points.reduce((w, p) => p.velocityRms > w.velocityRms ? p : w, points[0])
  const { zone, estado } = isoZone(worstPoint.velocityRms, isoClass)

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({
      tag, zone, estado,
      diagnostico: '⚠️ KIRA no está conectada — Configurá ANTHROPIC_API_KEY.',
      probabilidad_falla: null, rul: null, patron_falla: null, recomendaciones: null,
      fecha: new Date().toISOString(), inspector_name: userData?.name ?? 'Inspector', id: null,
    })
  }

  // Build measurement text summary
  const pointsText = points.map((p, i) => {
    const { zone: z } = isoZone(p.velocityRms, isoClass)
    return `  ${i + 1}. ${p.punto}: Vel=${p.velocityRms.toFixed(2)} mm/s (Zona ${z}) | Env=${p.envelopeGe.toFixed(3)} gE | Temp=${p.temperatura.toFixed(1)}°C`
  }).join('\n')

  const summaryText = `
Activo (TAG): ${tag}
Tipo de equipo: ${tipoEquipo || 'No especificado'}
Fecha medición: ${fecha || new Date().toLocaleDateString('es-AR')}
Observaciones: ${observaciones || 'Sin observaciones'}

=== MEDICIONES SKF QUICKCOLLECT ===
Clase ISO 10816: ${isoClass}
Umbrales → Zona A/B: ${ISO_THRESHOLDS[isoClass]?.[0]} mm/s | B/C: ${ISO_THRESHOLDS[isoClass]?.[1]} mm/s | C/D: ${ISO_THRESHOLDS[isoClass]?.[2]} mm/s

Puntos de medición (${points.length} total):
${pointsText}

Punto más crítico: ${worstPoint.punto} — ${worstPoint.velocityRms.toFixed(2)} mm/s (Zona ${zone})
`.trim()

  // Build Claude message content
  type ContentBlock =
    | { type: 'text'; text: string }
    | { type: 'document'; source: { type: 'base64'; media_type: 'application/pdf'; data: string }; title: string; context: string }

  const content: ContentBlock[] = []

  // Attach PDF if provided
  if (pdfBase64) {
    content.push({
      type: 'document',
      source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 },
      title: `Informe SKF QuickCollect — ${tag}`,
      context: 'Informe completo de mediciones del colector SKF QuickCollect. Usá este documento para enriquecer el diagnóstico.',
    })
  }

  content.push({ type: 'text', text: summaryText })

  let analysis: {
    diagnostico: string
    probabilidad_falla: number
    rul: string
    patron_falla: string
    recomendaciones: string
  }

  try {
    const client = new Anthropic({ apiKey })
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      system: SKF_SYSTEM_PROMPT,
      messages: [{ role: 'user', content }],
    })
    const rawText = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : {
      diagnostico: rawText,
      probabilidad_falla: 0,
      rul: 'No determinado',
      patron_falla: 'Ver diagnóstico',
      recomendaciones: 'Revisar diagnóstico completo',
    }
  } catch (e) {
    console.error('[SKF] Claude error:', e)
    return NextResponse.json({ error: 'Error al analizar con Claude.' }, { status: 500 })
  }

  // Save worst point to DB
  const admin = createAdminClient()
  const { data: saved } = await admin
    .from('skf_measurements')
    .insert({
      asset_tag: tag,
      inspector_id: userData?.id ?? user.id,
      fecha: new Date().toISOString(),
      velocity_rms: worstPoint.velocityRms,
      envelope_ge:  worstPoint.envelopeGe,
      temperatura:   worstPoint.temperatura,
      iso_class: isoClass,
      estado,
      diagnostico: analysis.diagnostico,
      tipo_equipo: tipoEquipo,
      punto_medicion: worstPoint.punto,
      falla_prob: analysis.probabilidad_falla,
      rul: analysis.rul,
      patron_falla: analysis.patron_falla,
      recomendaciones: analysis.recomendaciones,
      observaciones,
    })
    .select()
    .single()

  return NextResponse.json({
    id: saved?.id ?? null,
    tag,
    zone,
    estado,
    ...analysis,
    fecha: new Date().toISOString(),
    inspector_name: userData?.name ?? 'Inspector',
  })
}

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { scoreToEstado } from '@/lib/structural/templates'
import { riskScore, riskLevel } from '@/lib/structural/constants'

export const dynamic = 'force-dynamic'

const STRUCTURAL_PROMPT = `Sos KIRA, experto en inspección y diagnóstico de estructuras industriales para operaciones mineras en Patagonia, Argentina.

Recibís el resultado de un Formulario de Relevamiento Estructural (FRM) con items puntuados de 1 a 5, score global de la estructura, matriz de riesgo C×F×I y contexto adicional de la inspección.

Devolvé SIEMPRE y ÚNICAMENTE un JSON válido sin texto adicional:
{
  "diagnostico": "análisis técnico completo del estado estructural, destacando las áreas más críticas y el nivel de riesgo calculado",
  "probabilidad_falla": 25,
  "recomendaciones": "acciones concretas priorizadas por urgencia, indicando plazos y responsables"
}

Criterios de scoring FRM (1-5):
- 5 Excelente: sin defectos, operación normal
- 4 Bueno: defectos menores, sin impacto en seguridad
- 3 Regular: requiere monitoreo frecuente y planificación de mantenimiento
- 2 Deficiente: requiere intervención planificada a corto plazo
- 1 Crítico: requiere intervención inmediata, riesgo para la seguridad

Score global (0-100%):
- ≥70%: Aprobada — condición aceptable
- 50-69%: Observada — requiere correcciones planificadas
- <50%: Rechazada — no apta para operación normal

Matriz de riesgo (Criticidad × Frecuencia × Impacto, max 125):
- 1-25: Riesgo Bajo
- 26-50: Riesgo Medio
- 51-75: Riesgo Alto
- 76-125: Riesgo Crítico

Si hay protocolos FRM activos (riesgo fatal), priorizalos en las recomendaciones.
Normas de referencia: CIRSOC 101/102, ISO 13822, Ley 19587 (Argentina), estándares mineros Patagonia.
Respondé en español argentino técnico.`

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
    sector: string
    tipoEstructura: string
    tipoInspeccion: string
    estadoGlobal: string
    otSap?: string
    criticidad: number
    frecuencia: number
    impacto: number
    scorePct: number
    findings?: string
    observacionesGenerales?: string
    herramientasNdt: string[]
    frmRisks: string[]
    photos: string[]   // base64 data URLs
    categories: Array<{
      categoria: string
      items: Array<{
        item: string
        score: number
        observacion: string
      }>
    }>
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
  }

  const {
    tag, sector, tipoEstructura, tipoInspeccion, estadoGlobal,
    otSap, criticidad, frecuencia, impacto, scorePct,
    findings, observacionesGenerales, herramientasNdt, frmRisks,
    photos, categories,
  } = body

  if (!tag || !sector || !tipoEstructura) {
    return NextResponse.json({ error: 'TAG, sector y tipo de estructura son requeridos' }, { status: 400 })
  }

  const estado = scoreToEstado(scorePct)
  const risk = (criticidad && frecuencia && impacto) ? riskScore(criticidad, frecuencia, impacto) : 0
  const riskLvl = riskLevel(risk)

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({
      id: null, tag, sector, tipoEstructura, tipoInspeccion, estadoGlobal, otSap, scorePct, estado,
      criticidad, frecuencia, impacto, risk_score: risk, risk_label: riskLvl.label,
      herramientasNdt, frmRisks,
      diagnostico: '⚠️ KIRA no conectada — Configurá ANTHROPIC_API_KEY.',
      probabilidad_falla: null, recomendaciones: null,
      fecha: new Date().toISOString(), inspector_name: userData?.name ?? 'Inspector',
    })
  }

  // Build FRM summary for Claude
  const frmText = categories.map((cat) => {
    const scoredItems = cat.items.filter((i) => i.score > 0)
    const items = scoredItems
      .map((i) => {
        const scoreLabel = ['', 'Crítico', 'Deficiente', 'Regular', 'Bueno', 'Excelente'][i.score]
        const obs = i.observacion ? ` — ${i.observacion}` : ''
        return `    • ${i.item}: ${i.score}/5 (${scoreLabel})${obs}`
      })
      .join('\n')
    const catAvg = scoredItems.length > 0
      ? (scoredItems.reduce((s, i) => s + i.score, 0) / scoredItems.length).toFixed(2)
      : 'N/D'
    return `${cat.categoria} (promedio: ${catAvg}/5):\n${items}`
  }).join('\n\n')

  const criticalItems = categories
    .flatMap((c) => c.items)
    .filter((i) => i.score <= 2 && i.score > 0)
    .map((i) => `${i.item} (${i.score}/5)${i.observacion ? ': ' + i.observacion : ''}`)

  const summaryText = `
Activo (TAG): ${tag}
Sector: ${sector}
Tipo de estructura: ${tipoEstructura}
Tipo de inspección: ${tipoInspeccion || 'No especificado'}
Estado global del activo: ${estadoGlobal || 'No especificado'}
OT SAP: ${otSap || 'No asignada'}
Observaciones generales: ${observacionesGenerales || 'Sin observaciones adicionales'}
Hallazgos de campo: ${findings || 'Sin hallazgos adicionales'}

=== MATRIZ DE RIESGO ===
Criticidad: ${criticidad || 'N/D'}/5 | Frecuencia: ${frecuencia || 'N/D'}/5 | Impacto: ${impacto || 'N/D'}/5
Score de riesgo: ${risk || 'N/D'}/125 → Nivel: ${riskLvl.label.toUpperCase()}

=== HERRAMIENTAS NDT UTILIZADAS ===
${herramientasNdt.length > 0 ? herramientasNdt.join(', ') : 'Ninguna'}

=== PROTOCOLOS FRM ACTIVOS (RIESGO FATAL) ===
${frmRisks.length > 0 ? frmRisks.join(', ') : 'Ninguno'}

=== RESULTADOS FRM ===
Score global: ${scorePct}% → Estado: ${estado.toUpperCase()}

${frmText}

Items críticos (score ≤ 2/5): ${criticalItems.length > 0 ? criticalItems.join('; ') : 'Ninguno'}
`.trim()

  let analysis: { diagnostico: string; probabilidad_falla: number; recomendaciones: string }

  try {
    const client = new Anthropic({ apiKey })
    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      system: STRUCTURAL_PROMPT,
      messages: [{ role: 'user', content: summaryText }],
    })
    const raw = response.content[0].type === 'text' ? response.content[0].text : ''
    const match = raw.match(/\{[\s\S]*\}/)
    analysis = match ? JSON.parse(match[0]) : {
      diagnostico: raw, probabilidad_falla: 0, recomendaciones: 'Ver diagnóstico',
    }
  } catch (e) {
    console.error('[Structural] Claude error:', e)
    return NextResponse.json({ error: 'Error al analizar con Claude.' }, { status: 500 })
  }

  // Upload field photos to storage
  const admin = createAdminClient()
  const uploadedPhotoUrls: string[] = []

  for (const dataUrl of photos) {
    try {
      const base64 = dataUrl.split(',')[1]
      if (!base64) continue
      const buffer = Buffer.from(base64, 'base64')
      const ext = dataUrl.startsWith('data:image/png') ? 'png' : dataUrl.startsWith('data:image/webp') ? 'webp' : 'jpg'
      const path = `photos/${Date.now()}_${tag.replace(/[^a-z0-9]/gi, '_')}_${uploadedPhotoUrls.length}.${ext}`

      const { error: uploadErr } = await admin.storage
        .from('inspection-photos')
        .upload(path, buffer, {
          contentType: ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg',
          upsert: false,
        })

      if (!uploadErr) {
        const { data: urlData } = admin.storage.from('inspection-photos').getPublicUrl(path)
        uploadedPhotoUrls.push(urlData.publicUrl)
      }
    } catch {
      // Skip failed photo uploads silently
    }
  }

  // Save inspection to DB
  const { data: savedInsp } = await admin
    .from('inspections')
    .insert({
      asset_tag: tag,
      inspector_id: userData?.id ?? user.id,
      fecha: new Date().toISOString(),
      tipo: 'preventiva',
      sector,
      tipo_estructura: tipoEstructura,
      tipo_inspeccion: tipoInspeccion || null,
      estado_global: estadoGlobal || null,
      ot_sap: otSap || null,
      score_pct: scorePct,
      estado,
      criticidad: criticidad || null,
      frecuencia: frecuencia || null,
      impacto: impacto || null,
      risk_score: risk || null,
      findings: findings || null,
      herramientas_ndt: herramientasNdt.length > 0 ? JSON.stringify(herramientasNdt) : null,
      frm_risks: frmRisks.length > 0 ? JSON.stringify(frmRisks) : null,
      photos: uploadedPhotoUrls.length > 0 ? JSON.stringify(uploadedPhotoUrls) : null,
      diagnostico: analysis.diagnostico,
      recomendaciones: analysis.recomendaciones,
      falla_prob: analysis.probabilidad_falla,
      notas: observacionesGenerales,
    })
    .select()
    .single()

  // Save checklist items
  if (savedInsp?.id) {
    const checklistRows = categories.flatMap((cat) =>
      cat.items
        .filter((i) => i.score > 0)
        .map((i) => ({
          inspection_id: savedInsp.id,
          categoria: cat.categoria,
          descripcion: i.item,
          score_item: i.score,
          observacion: i.observacion || null,
          resultado: i.score <= 2 ? 'falla' : i.score === 3 ? 'observacion' : 'ok',
        }))
    )
    if (checklistRows.length > 0) {
      await admin.from('checklist_items').insert(checklistRows)
    }
  }

  return NextResponse.json({
    id: savedInsp?.id ?? null,
    tag, sector, tipoEstructura, tipoInspeccion, estadoGlobal, otSap, scorePct, estado,
    criticidad, frecuencia, impacto, risk_score: risk, risk_label: riskLvl.label,
    herramientasNdt, frmRisks,
    photos: uploadedPhotoUrls,
    findings,
    ...analysis,
    fecha: new Date().toISOString(),
    inspector_name: userData?.name ?? 'Inspector',
  })
}

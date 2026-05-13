import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const SONOMAT_SYSTEM_PROMPT = `Sos KIRA, experto en análisis de señales de vibración y acústica industrial para operaciones mineras en Patagonia, Argentina.

Analizás métricas computadas por pipeline DSP (TWF, FFT, PSD Welch, AEA, Kurtosis) para diagnosticar el estado de salud de equipos industriales.

Devolvé SIEMPRE y ÚNICAMENTE un JSON válido sin texto adicional:
{
  "diagnostico": "descripción técnica completa del estado del equipo",
  "probabilidad_falla": 45,
  "rul": "3-6 meses",
  "patron_falla": "tipo y descripción del patrón de falla detectado",
  "frecuencias_caracteristicas": "análisis de frecuencias relevantes y su significado",
  "recomendaciones": "acciones concretas priorizadas"
}

Criterios de interpretación:
- Kurtosis < 3: Normal — señal gaussiana, sin impactos
- Kurtosis 3-6: Alerta — impactos leves, vigilar
- Kurtosis 6-10: Falla incipiente — rodamiento/engranaje con defecto
- Kurtosis > 10: Falla avanzada — intervención urgente

- AEA > 15%: Actividad de alta frecuencia significativa (rodamientos, cavitación, rozamiento)
- Crest Factor > 3.5: Picos impulsivos relevantes
- Factor de cresta > 5: Impactos severos

Frecuencias características típicas (según tipo de equipo):
- Motor eléctrico: 1x, 2x, harmonicas de frecuencia de red (50Hz)
- Bomba: frecuencias de paletas (BPF = n_paletas × RPM/60)
- Compresor: frecuencia de cilindros
- Rodamientos SKF: BPFO, BPFI, BSF, FTF según geometría

Estimá probabilidad de falla (0-100%) y RUL en unidades apropiadas (horas/días/semanas/meses).
Normas: ISO 10816, ISO 13373, ISO 18436-2.
Respondé en español argentino técnico.`

export async function POST(request: NextRequest) {
  // Auth
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { data: userData } = await supabase
    .from('users')
    .select('id, name')
    .eq('id', user.id)
    .single()

  // Parse body
  let body: {
    tag: string
    tipoEquipo: string
    observation?: string
    metrics: {
      sampleRate: number
      duration: number
      rms: number
      kurtosis: number
      crestFactor: number
      aeaRms: number
      aeaPercentage: number
      dominantFrequency: number
      peakFrequencies: Array<{ frequency: number; magnitudeDb: number }>
    }
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
  }

  const { tag, tipoEquipo, observation, metrics } = body

  if (!tag || !metrics) {
    return NextResponse.json({ error: 'TAG y métricas son requeridos' }, { status: 400 })
  }

  // No API key → placeholder
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({
      tag,
      diagnostico: '⚠️ KIRA no está conectada — Configurá ANTHROPIC_API_KEY para el análisis.',
      probabilidad_falla: null,
      rul: null,
      patron_falla: null,
      frecuencias_caracteristicas: null,
      recomendaciones: 'Configurá la API key de Claude para habilitar el diagnóstico de señales.',
      metrics,
      fecha: new Date().toISOString(),
      inspector_name: userData?.name ?? 'Inspector',
      id: null,
    })
  }

  // Build context for Claude
  const peaksText = metrics.peakFrequencies
    .map((p, i) => `${i + 1}. ${p.frequency.toFixed(1)} Hz (${p.magnitudeDb.toFixed(1)} dB)`)
    .join(', ')

  const metricsText = `
Activo (TAG): ${tag}
Tipo de equipo: ${tipoEquipo || 'No especificado'}
Observaciones del inspector: ${observation || 'Sin observaciones adicionales'}

=== MÉTRICAS DSP COMPUTADAS ===
Duración: ${metrics.duration.toFixed(2)} s
Frecuencia de muestreo: ${metrics.sampleRate} Hz
RMS (normalizado): ${metrics.rms.toFixed(6)}
Kurtosis: ${metrics.kurtosis.toFixed(3)}
Factor de cresta: ${metrics.crestFactor.toFixed(3)}
Nivel AEA (>2000Hz): ${metrics.aeaRms.toFixed(6)} RMS | ${metrics.aeaPercentage.toFixed(1)}% de energía total
Frecuencia dominante: ${metrics.dominantFrequency.toFixed(1)} Hz
Picos espectrales (top 5): ${peaksText || 'No detectados'}
`.trim()

  // Call Claude
  let analysis: {
    diagnostico: string
    probabilidad_falla: number
    rul: string
    patron_falla: string
    frecuencias_caracteristicas: string
    recomendaciones: string
  }

  try {
    const client = new Anthropic({ apiKey })
    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 2048,
      system: SONOMAT_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: metricsText }],
    })

    const rawText = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      analysis = JSON.parse(jsonMatch[0])
    } else {
      analysis = {
        diagnostico: rawText,
        probabilidad_falla: 0,
        rul: 'No determinado',
        patron_falla: 'Ver diagnóstico',
        frecuencias_caracteristicas: 'Ver diagnóstico',
        recomendaciones: 'Revisar diagnóstico completo',
      }
    }
  } catch (e) {
    console.error('[Sonomat] Claude error:', e)
    return NextResponse.json({ error: 'Error al analizar señal con Claude.' }, { status: 500 })
  }

  // Save to DB
  const admin = createAdminClient()
  const { data: saved } = await admin
    .from('audio_analyses')
    .insert({
      asset_tag: tag,
      inspector_id: userData?.id ?? user.id,
      fecha: new Date().toISOString(),
      rms: metrics.rms,
      kurtosis: metrics.kurtosis,
      crest_factor: metrics.crestFactor,
      aea_level: metrics.aeaRms,
      peak_freq: metrics.dominantFrequency,
      falla_prob: analysis.probabilidad_falla,
      rul: analysis.rul,
      diagnostico: analysis.diagnostico,
      patron_falla: analysis.patron_falla,
      frecuencias_caracteristicas: analysis.frecuencias_caracteristicas,
      recomendaciones: analysis.recomendaciones,
      tipo_equipo: tipoEquipo,
      sample_rate: metrics.sampleRate,
      duration_s: metrics.duration,
    })
    .select()
    .single()

  return NextResponse.json({
    id: saved?.id ?? null,
    tag,
    ...analysis,
    metrics,
    fecha: new Date().toISOString(),
    inspector_name: userData?.name ?? 'Inspector',
  })
}

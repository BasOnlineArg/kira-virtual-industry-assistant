import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const KIRA_SYSTEM_PROMPT = `Sos KIRA, un asistente de inteligencia artificial especializado en mantenimiento industrial para operaciones mineras en Patagonia, Argentina.

Tu expertise incluye:
- Análisis de vibraciones y acústica (ISO 10816, normas de vibración)
- Inspección visual y termografía industrial
- Análisis de señales DSP (FFT, PSD, Kurtosis, RMS)
- Mantenimiento predictivo, preventivo y correctivo
- Estándares técnicos: ISO 10816, ASME B30, API 653, ISO 45001, Ley 19587
- Equipos de minería: compresores, bombas, motores, transportadores, izaje
- SAP PM y gestión de órdenes de trabajo

Respondés siempre en español argentino. Sos técnico, preciso y fundamentás tus respuestas en normas y metodologías industriales reconocidas. Cuando sea relevante, citás las normas aplicables.`

export async function POST(request: NextRequest) {
  // Verify authentication
  const supabase = createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // Check API key availability
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Claude API no configurada. Agregá ANTHROPIC_API_KEY al .env.local.' },
      { status: 503 }
    )
  }

  try {
    const body = await request.json()
    const { messages, system, max_tokens = 4096 } = body

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'messages es requerido' }, { status: 400 })
    }

    const client = new Anthropic({ apiKey })

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens,
      system: system ?? KIRA_SYSTEM_PROMPT,
      messages,
    })

    return NextResponse.json(response)
  } catch (error) {
    console.error('[Claude API] Error:', error)
    return NextResponse.json({ error: 'Error al contactar Claude API' }, { status: 500 })
  }
}

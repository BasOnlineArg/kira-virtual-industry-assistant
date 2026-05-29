// POST /api/rca/analyze
// Receives a pre-built prompt string from the client and returns the AI JSON result.
// The prompt is constructed client-side in RcaAiPanel.tsx.

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

export const dynamic    = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY no configurada' }, { status: 503 })

  let body: { prompt: string }
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Payload inválido' }, { status: 400 }) }

  if (!body.prompt?.trim()) {
    return NextResponse.json({ error: 'prompt es requerido' }, { status: 400 })
  }

  try {
    const client = new Anthropic({ apiKey })

    const message = await client.messages.create({
      model:      'claude-opus-4-5',
      max_tokens: 2048,
      messages:   [{ role: 'user', content: body.prompt }],
    })

    const raw = (message.content[0] as { type: string; text: string }).text.trim()
    // Strip accidental markdown fences
    const jsonStr = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    const result = JSON.parse(jsonStr)

    return NextResponse.json(result)

  } catch (err) {
    console.error('[RCA analyze]', err)
    const msg = err instanceof SyntaxError
      ? 'La IA devolvió una respuesta inesperada. Intentá de nuevo.'
      : 'Error al procesar el análisis. Verificá la API key y el modelo.'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

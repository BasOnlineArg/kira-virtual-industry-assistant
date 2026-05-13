// POST /api/manuals/chat
// RAG query using PostgreSQL Full-Text Search (tsvector/GIN).
// No external embedding API — zero extra cost per query.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function getAnthropic() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY no configurada')
  return new Anthropic({ apiKey })
}

const SYSTEM_PROMPT = `Eres KIRA, el asistente técnico especializado en mantenimiento industrial de minas en la Patagonia argentina.
Tu función es responder preguntas técnicas utilizando EXCLUSIVAMENTE la información contenida en los fragmentos de manuales y pautas proporcionados.

REGLAS ESTRICTAS:
1. Respondé SOLO con información que esté en los fragmentos. Si no está, decí explícitamente: "Esta información no se encuentra en los documentos cargados."
2. Siempre citá la fuente: manual, sección y página cuando estén disponibles.
3. Usá terminología técnica industrial precisa. No simplifiques datos de fabricante (OEM).
4. Si hay datos numéricos (torques, presiones, intervalos de mantenimiento), transcribílos exactamente.
5. Respondé en español técnico, conciso y estructurado.`

interface ChatBody {
  sessionId:  string
  query:      string
  manualIds?: string[]
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  let body: ChatBody
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
  }

  const { sessionId, query, manualIds } = body
  if (!sessionId || !query?.trim()) {
    return NextResponse.json({ error: 'sessionId y query son requeridos' }, { status: 400 })
  }

  const admin = createAdminClient()

  // 1. Verify session belongs to user
  const { data: session } = await admin
    .from('manual_chat_sessions')
    .select('id, titulo')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .single()

  if (!session) return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 })

  // 2. Save user message
  const { error: userMsgErr } = await admin.from('manual_chat_messages').insert({
    session_id: sessionId,
    role:       'user',
    content:    query,
  })
  if (userMsgErr) return NextResponse.json({ error: 'Error al guardar mensaje' }, { status: 500 })

  // 3. Full-Text Search via RPC (no embedding needed)
  const filterIds = manualIds && manualIds.length > 0 ? manualIds : null
  const { data: chunks, error: searchErr } = await admin.rpc('search_manual_chunks', {
    query_text:        query,
    match_count:       6,
    filter_manual_ids: filterIds,
  })

  if (searchErr) {
    console.error('[Chat] FTS search error:', searchErr)
    return NextResponse.json({ error: 'Error en búsqueda de contexto' }, { status: 500 })
  }

  // 4. Get manual names for citations
  const uniqueManualIds = Array.from(new Set((chunks ?? []).map((c: Record<string, unknown>) => c.manual_id as string)))
  const { data: manualRows } = uniqueManualIds.length > 0
    ? await admin.from('manuals').select('id, nombre, fabricante').in('id', uniqueManualIds)
    : { data: [] }

  const manualMap = new Map(
    (manualRows ?? []).map((m) => [m.id, { nombre: m.nombre, fabricante: m.fabricante }])
  )

  // 5. Build context block for Claude
  const hasChunks = (chunks ?? []).length > 0
  const contextBlock = hasChunks
    ? (chunks as Record<string, unknown>[]).map((c, i) => {
        const m = manualMap.get(c.manual_id as string)
        const rankPct = Math.round((c.rank as number) * 100)
        return [
          `--- Fragmento ${i + 1} (relevancia: ${rankPct > 0 ? rankPct + '%' : 'alta'}) ---`,
          `[Manual: ${m?.nombre ?? 'Desconocido'} | Fabricante: ${m?.fabricante ?? ''}]`,
          c.section_path ? `[Sección: ${c.section_path}]` : '',
          c.page_start   ? `[Página aprox.: ${c.page_start}]` : '',
          '',
          c.content,
        ].filter(Boolean).join('\n')
      }).join('\n\n')
    : 'No se encontraron fragmentos relevantes en los documentos cargados para esta consulta.'

  // 6. Load recent message history (last 10 messages)
  const { data: history } = await admin
    .from('manual_chat_messages')
    .select('role, content')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(11)  // +1 to exclude the user msg just inserted

  const recentHistory = (history ?? []).reverse().slice(0, -1)

  // 7. Call Claude with strict RAG system prompt
  const messages: Anthropic.MessageParam[] = [
    ...recentHistory.map((m) => ({
      role:    m.role as 'user' | 'assistant',
      content: m.content as string,
    })),
    {
      role:    'user',
      content: `CONTEXTO DE MANUALES TÉCNICOS:\n\n${contextBlock}\n\n---\nPREGUNTA: ${query}`,
    },
  ]

  const claudeRes = await getAnthropic().messages.create({
    model:      'claude-haiku-4-5',
    max_tokens: 1024,
    system:     SYSTEM_PROMPT,
    messages,
  })

  const answer = claudeRes.content[0].type === 'text' ? claudeRes.content[0].text : ''

  // 8. Build citations
  const chunksUsed = (chunks ?? []).map((c: Record<string, unknown>) => {
    const m = manualMap.get(c.manual_id as string)
    return {
      chunkId:      c.id,
      manualId:     c.manual_id,
      manualNombre: m?.nombre ?? '',
      fabricante:   m?.fabricante ?? '',
      sectionPath:  c.section_path,
      pageStart:    c.page_start,
      rank:         c.rank,
    }
  })

  // 9. Save assistant message with citations
  const { data: savedMsg, error: asstMsgErr } = await admin
    .from('manual_chat_messages')
    .insert({
      session_id:  sessionId,
      role:        'assistant',
      content:     answer,
      chunks_used: chunksUsed,
    })
    .select()
    .single()
  if (asstMsgErr) return NextResponse.json({ error: 'Error al guardar respuesta' }, { status: 500 })

  // 10. Auto-title session on first exchange
  if (session.titulo === 'Nueva consulta') {
    const shortTitle = query.length > 60 ? query.slice(0, 57) + '…' : query
    await admin
      .from('manual_chat_sessions')
      .update({ titulo: shortTitle, updated_at: new Date().toISOString() })
      .eq('id', sessionId)
  } else {
    await admin
      .from('manual_chat_sessions')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', sessionId)
  }

  return NextResponse.json({
    message:    savedMsg,
    chunksUsed,
    chunkCount: (chunks ?? []).length,
  })
}

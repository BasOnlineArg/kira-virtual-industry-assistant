import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// ── GET — list user's saved analyses ─────────────────────────────────────────
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data, error } = await supabase
    .from('rca_analyses')
    .select('id, created_at, updated_at, title, nro, ai_result')
    .order('updated_at', { ascending: false })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// ── POST — create new analysis ────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  let body: {
    title:     string
    nro:       string
    w2h:       Record<string, unknown>
    cat_data:  Array<{ text: string; causes: string[] }>
    insp_text: string
    events:    unknown[]
    ai_result: Record<string, unknown> | null
  }
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Payload inválido' }, { status: 400 }) }

  const { data, error } = await supabase
    .from('rca_analyses')
    .insert({
      created_by: user.id,
      title:      body.title,
      nro:        body.nro,
      w2h:        body.w2h,
      cat_data:   body.cat_data,
      insp_text:  body.insp_text,
      events:     body.events,
      ai_result:  body.ai_result,
    })
    .select('id, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

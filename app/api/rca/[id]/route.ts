import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// ── GET — load single analysis ────────────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data, error } = await supabase
    .from('rca_analyses')
    .select('id, w2h, cat_data, insp_text, events, ai_result')
    .eq('id', params.id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  return NextResponse.json(data)
}

// ── PUT — update existing analysis ────────────────────────────────────────────
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  let body: Record<string, unknown>
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Payload inválido' }, { status: 400 }) }

  const { data, error } = await supabase
    .from('rca_analyses')
    .update({
      title:     body.title,
      nro:       body.nro,
      w2h:       body.w2h,
      cat_data:  body.cat_data,
      insp_text: body.insp_text,
      events:    body.events,
      ai_result: body.ai_result,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.id)
    .select('id, updated_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// ── DELETE — delete analysis ──────────────────────────────────────────────────
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { error } = await supabase
    .from('rca_analyses')
    .delete()
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

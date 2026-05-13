import { NextRequest, NextResponse } from 'next/server'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// ── GET — list history ────────────────────────────────────────────────────────
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('rca_events')
    .select('id, created_at, inspector_name, w5h2, analysis_result')
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// ── POST — save RCA ───────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: userData } = await supabase
    .from('users').select('name').eq('id', user.id).single()

  let body: {
    w5h2:           Record<string, unknown>
    ishikawa:       Record<string, unknown>
    porgues:        Record<string, unknown>
    inspectorNotes: string
    analysis:       Record<string, unknown>
  }
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Payload inválido' }, { status: 400 }) }

  const admin = createAdminClient()

  const { data, error } = await admin
    .from('rca_events')
    .insert({
      created_by:      user.id,
      inspector_name:  userData?.name ?? user.email ?? 'Inspector',
      w5h2:            body.w5h2,
      ishikawa:        body.ishikawa,
      porgues:         body.porgues,
      inspector_notes: body.inspectorNotes,
      analysis_result: body.analysis,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

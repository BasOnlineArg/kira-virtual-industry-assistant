import { NextRequest, NextResponse } from 'next/server'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAudit }          from '@/lib/admin/audit'

// ── Guard: solo superusuario ─────────────────────────────────────────────────
async function getCallerOrDeny() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('users')
    .select('id, email, role')
    .eq('id', user.id)
    .single()

  if (!data || data.role !== 'superusuario') return null
  return data
}

// ── GET /api/admin/users — lista todos los usuarios ──────────────────────────
export async function GET() {
  const caller = await getCallerOrDeny()
  if (!caller) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('users')
    .select('id, email, name, role, active, created_at')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// ── PATCH /api/admin/users — cambia role o active de un usuario ──────────────
export async function PATCH(req: NextRequest) {
  const caller = await getCallerOrDeny()
  if (!caller) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: { id: string; role?: string; active?: boolean }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
  }
  const { id, role, active } = body

  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })

  const update: Record<string, unknown> = {}
  if (role   !== undefined) update.role   = role
  if (active !== undefined) update.active = active

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('users')
    .update(update)
    .eq('id', id)
    .select('id, email, name, role, active')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logAudit({
    userId:    caller.id,
    userEmail: caller.email,
    action:    role !== undefined ? 'CHANGE_ROLE' : 'TOGGLE_ACTIVE',
    module:    'admin.users',
    entityId:  id,
    metadata:  update,
  })

  return NextResponse.json(data)
}

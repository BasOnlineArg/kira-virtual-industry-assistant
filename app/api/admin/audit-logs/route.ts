import { NextRequest, NextResponse } from 'next/server'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function getCallerOrDeny() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('users').select('id, role').eq('id', user.id).single()
  if (!data || data.role !== 'superusuario') return null
  return data
}

// ── GET /api/admin/audit-logs?module=&user_email=&from=&to=&limit= ───────────
export async function GET(req: NextRequest) {
  const caller = await getCallerOrDeny()
  if (!caller) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = req.nextUrl
  const moduleFilter = searchParams.get('module')
  const userEmail    = searchParams.get('user_email')
  const from         = searchParams.get('from')
  const to           = searchParams.get('to')
  const limit        = parseInt(searchParams.get('limit') ?? '100', 10)

  const admin = createAdminClient()
  let query = admin
    .from('audit_logs')
    .select('id, user_id, user_email, action, module, entity_id, metadata, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (moduleFilter) query = query.eq('module', moduleFilter)
  if (userEmail) query = query.ilike('user_email', `%${userEmail}%`)
  if (from)      query = query.gte('created_at', from)
  if (to)        query = query.lte('created_at', to)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

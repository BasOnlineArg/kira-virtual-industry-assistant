import { NextRequest, NextResponse } from 'next/server'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PATCH(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  let body: { id?: string; lat?: number; lng?: number }
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Payload inválido' }, { status: 400 }) }
  const { id, lat, lng } = body

  if (!id || lat == null || lng == null) {
    return NextResponse.json({ error: 'Faltan parámetros: id, lat, lng' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('assets')
    .update({ lat, lng })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, lat, lng })
}

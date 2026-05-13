import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('assets')
    .select('id, tag, nombre, tipo, sector, mina, lat, lng, status, ub_tecnica, ubicacion_fisica, ruta_zona, frec_sem, hh_ocurr, hh_anual')
    .order('tag', { ascending: true })
    .limit(1000)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  let body: Record<string, unknown>
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('assets')
    .insert({
      tag:                body.tag,
      nombre:             body.nombre,
      tipo:               body.tipo,
      capa:               body.capa,
      sector:             body.sector ?? '',
      mina:               body.mina ?? null,
      lat:                body.lat   ?? null,
      lng:                body.lng   ?? null,
      ug_x:               body.ugX   ?? null,
      ug_y:               body.ugY   ?? null,
      status:             body.status ?? 'Operativo',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// GET — list all reports
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('structural_reports')
    .select('*')
    .order('fecha', { ascending: false })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST — upload a new report
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: userData } = await supabase
    .from('users').select('id').eq('id', user.id).single()

  let body: {
    nombre: string
    tipo: 'pdf' | 'imagen'
    base64: string
    assetTag?: string
    descripcion?: string
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
  }

  const { nombre, tipo, base64, assetTag, descripcion } = body

  // Upload to Supabase Storage
  const ext = tipo === 'pdf' ? 'pdf' : 'jpg'
  const path = `reports/${Date.now()}_${nombre.replace(/[^a-z0-9]/gi, '_')}.${ext}`

  const buffer = Buffer.from(base64, 'base64')
  const admin = createAdminClient()

  const { error: uploadError } = await admin.storage
    .from('structural-reports')
    .upload(path, buffer, {
      contentType: tipo === 'pdf' ? 'application/pdf' : 'image/jpeg',
      upsert: false,
    })

  if (uploadError) {
    console.error('[Reports] Storage upload error:', uploadError)
    return NextResponse.json({ error: 'Error al subir el archivo.' }, { status: 500 })
  }

  const { data: urlData } = admin.storage.from('structural-reports').getPublicUrl(path)

  const { data: saved, error: dbError } = await admin
    .from('structural_reports')
    .insert({
      inspector_id: userData?.id ?? user.id,
      nombre,
      tipo,
      url: urlData.publicUrl,
      asset_tag: assetTag || null,
      descripcion: descripcion || null,
    })
    .select()
    .single()

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
  return NextResponse.json(saved)
}

// DELETE — remove a report
export async function DELETE(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await request.json()
  const admin = createAdminClient()

  const { data: report } = await admin
    .from('structural_reports').select('url').eq('id', id).single()

  if (report?.url) {
    const path = report.url.split('/structural-reports/')[1]
    if (path) await admin.storage.from('structural-reports').remove([path])
  }

  const { error: deleteError } = await admin.from('structural_reports').delete().eq('id', id)
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

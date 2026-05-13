import { NextRequest, NextResponse } from 'next/server'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAudit }          from '@/lib/admin/audit'

async function getCallerOrDeny() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('users').select('id, email, role').eq('id', user.id).single()
  if (!data || data.role !== 'superusuario') return null
  return data
}

// ── POST /api/admin/invite ────────────────────────────────────────────────────
// Invita un usuario por email via Supabase Auth.
// Supabase envía el email de activación automáticamente.
// Al aceptar la invitación, el usuario queda en auth.users y el trigger
// crea su perfil en public.users con el rol indicado.

export async function POST(req: NextRequest) {
  const caller = await getCallerOrDeny()
  if (!caller) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: { email?: string; role?: string }
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Payload inválido' }, { status: 400 }) }

  const { email, role = 'inspector' } = body
  if (!email) return NextResponse.json({ error: 'email requerido' }, { status: 400 })

  const validRoles = ['superusuario', 'supervisor', 'inspector']
  if (!validRoles.includes(role)) {
    return NextResponse.json({ error: 'Rol inválido' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Invitar via Supabase Auth — envía email con link de activación
  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
    email.toLowerCase().trim(),
    { data: { role } }  // metadata disponible en el trigger de auth
  )

  if (inviteError) {
    // Si el usuario ya existe en auth, igual lo podemos agregar a public.users
    if (inviteError.message.includes('already been registered')) {
      return NextResponse.json({
        error: 'Este email ya tiene una cuenta. Cambiá su rol desde la lista de usuarios.',
      }, { status: 409 })
    }
    return NextResponse.json({ error: inviteError.message }, { status: 500 })
  }

  // Pre-crear perfil en public.users con el rol asignado
  // (el trigger lo crea al aceptar, pero lo pre-creamos para que el superusuario
  //  pueda ver el usuario pendiente y su rol desde ya)
  await admin.from('users').upsert({
    id:    invited.user.id,
    email: email.toLowerCase().trim(),
    name:  email.split('@')[0],  // nombre provisorio hasta que el usuario lo complete
    role,
    active: false,  // se activa cuando acepta la invitación
  }, { onConflict: 'id', ignoreDuplicates: false })

  await logAudit({
    userId:    caller.id,
    userEmail: caller.email,
    action:    'USER_INVITED',
    module:    'admin.users',
    entityId:  invited.user.id,
    metadata:  { email, role },
  })

  return NextResponse.json({ ok: true, email, role }, { status: 201 })
}

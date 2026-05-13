import { redirect }          from 'next/navigation'
import { Settings, ShieldAlert } from 'lucide-react'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import AdminClient           from '@/components/admin/AdminClient'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  // ── Auth + role guard ──────────────────────────────────────────────────────
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase
    .from('users')
    .select('role, name')
    .eq('id', user.id)
    .single()

  if (!me || me.role !== 'superusuario') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <ShieldAlert className="w-10 h-10 text-red-400" />
        <h2 className="text-lg font-semibold text-slate-200">Acceso restringido</h2>
        <p className="text-sm text-slate-500 max-w-sm">
          Este módulo es exclusivo para Superusuarios.
          Contactá al administrador del sistema si necesitás acceso.
        </p>
      </div>
    )
  }

  // ── Data fetch ─────────────────────────────────────────────────────────────
  const admin = createAdminClient()

  const [
    { data: usersRaw },
    { data: logsRaw  },
  ] = await Promise.all([
    admin.from('users')
      .select('id, email, name, role, active, created_at')
      .order('created_at', { ascending: false }),
    admin.from('audit_logs')
      .select('id, user_id, user_email, action, module, entity_id, metadata, created_at')
      .order('created_at', { ascending: false })
      .limit(200),
  ])

  return (
    <div className="flex flex-col gap-6 pb-6">
      {/* Header */}
      <div className="shrink-0">
        <div className="flex items-center gap-3 mb-1">
          <Settings className="w-5 h-5 text-sky-400" />
          <h1 className="text-2xl font-bold text-slate-100">Administración</h1>
        </div>
        <p className="text-sm text-slate-500 mt-1">
          Gestión de usuarios, invitaciones y audit log · Solo superusuario
        </p>
      </div>

      <AdminClient
        initialUsers={usersRaw ?? []}
        initialLogs={logsRaw   ?? []}
      />
    </div>
  )
}

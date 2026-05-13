import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import NoticesClient from '@/components/notices/NoticesClient'
import type { Aviso } from '@/lib/notices/types'

export const dynamic = 'force-dynamic'

export default async function NoticesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Server-side initial fetch
  const admin = createAdminClient()
  const { data } = await admin
    .from('avisos')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500)

  const initialAvisos: Aviso[] = (data ?? []).map((row) => ({
    id:           row.id,
    fecha:        row.fecha,
    isoWeek:      row.iso_week,
    isoYear:      row.iso_year,
    prioridad:    row.prioridad,
    tag:          row.tag,
    ejecutante:   row.ejecutante,
    descripcion:  row.descripcion,
    generadoSAP:  row.generado_sap,
    createdAt:    row.created_at,
  }))

  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 mb-5 print:mb-3">
        <h1 className="text-2xl font-bold text-slate-100 print:text-black">
          Avisos para Generar — SAP Intake
        </h1>
        <p className="text-sm text-slate-500 mt-1 print:text-gray-600">
          Prioridades MN · MI · BKL · PP · Especialidades · Trazabilidad SAP
        </p>
      </div>
      <div className="flex-1 min-h-0">
        <NoticesClient initialAvisos={initialAvisos} />
      </div>
    </div>
  )
}

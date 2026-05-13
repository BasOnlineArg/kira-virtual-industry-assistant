import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import InspectionPlanClient from '@/components/inspection-plan/InspectionPlanClient'

export default async function InspectionPlanPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Load active program
  const { data: program } = await supabase
    .from('inspection_programs')
    .select('id, filename, uploaded_at, total_assets')
    .eq('is_active', true)
    .order('uploaded_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let items:  Record<string, unknown>[] = []
  let routes: Record<string, unknown>[] = []

  if (program) {
    const [itemsRes, routesRes] = await Promise.all([
      supabase
        .from('inspection_gantt_items')
        .select('*')
        .eq('program_id', program.id)
        .order('asset_num'),
      supabase
        .from('inspection_routes')
        .select('*')
        .eq('program_id', program.id)
        .order('sort_order'),
    ])
    items  = itemsRes.data  ?? []
    routes = routesRes.data ?? []
  }

  return (
    <InspectionPlanClient
      program={program  ?? null}
      items={items   as never}
      routes={routes as never}
    />
  )
}

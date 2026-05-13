import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET — returns active program with its gantt items and routes
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  // Active program
  const { data: program } = await supabase
    .from('inspection_programs')
    .select('*')
    .eq('is_active', true)
    .order('uploaded_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!program) {
    return NextResponse.json({ program: null, items: [], routes: [] })
  }

  const [{ data: items }, { data: routes }] = await Promise.all([
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

  return NextResponse.json({ program, items: items ?? [], routes: routes ?? [] })
}

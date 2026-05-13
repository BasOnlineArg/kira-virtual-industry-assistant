import { redirect }           from 'next/navigation'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import KiraMap               from '@/components/geo/KiraMap'
import { MOCK_ASSETS }       from '@/lib/geo/mock'
import type { Asset }        from '@/lib/geo/types'

export const dynamic = 'force-dynamic'

export default async function GeoPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  let assets: Asset[] = []

  try {
    const admin = createAdminClient()
    const { data } = await admin
      .from('assets')
      .select(`
        id, tag, nombre, tipo, capa, sector, mina,
        lat, lng, ug_x, ug_y,
        status, estado, ubicacion, inspector_asignado,
        ultima_inspeccion, proxima_inspeccion
      `)
      .order('nombre')

    assets = (data && data.length > 0) ? data as Asset[] : MOCK_ASSETS
  } catch {
    assets = MOCK_ASSETS
  }

  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 mb-4">
        <h1 className="text-2xl font-bold text-slate-100">Geolocalización de Activos</h1>
        <p className="text-sm text-slate-500 mt-1">
          Superficie satelital · Subterráneo por plano · {assets.length} activos
        </p>
      </div>
      {/* Map takes remaining height */}
      <div className="flex-1 min-h-0">
        <KiraMap assets={assets} />
      </div>
    </div>
  )
}

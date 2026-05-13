import { redirect }          from 'next/navigation'
import { Database }          from 'lucide-react'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import AuxiliaresClient      from '@/components/auxiliares/AuxiliaresClient'

export const dynamic = 'force-dynamic'

export default async function AuxiliaresPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase
    .from('users').select('role').eq('id', user.id).single()

  const isSuperusuario = me?.role === 'superusuario'
  const admin = createAdminClient()

  const [
    { data: categorias  },
    { data: tiposActivo },
    { data: rutas       },
    { data: equipos     },
    { data: repuestos   },
    { data: assets      },
  ] = await Promise.all([
    admin.from('categorias').select('*').order('nombre'),
    admin.from('tipos_activo').select('*').order('nombre'),
    admin.from('rutas_inspeccion').select('*').order('nombre'),
    admin.from('equipos_trabajo').select('*').order('nombre'),
    admin.from('repuestos').select('*').order('created_at', { ascending: false }).limit(500),
    admin.from('assets').select('id, tag, nombre, tipo, sector, mina, lat, lng, status, ub_tecnica, ubicacion_fisica, ruta_zona, frec_sem, hh_ocurr, hh_anual').order('tag').limit(1000),
  ])

  return (
    <div className="flex flex-col gap-6 pb-6">
      <div className="shrink-0">
        <div className="flex items-center gap-3 mb-1">
          <Database className="w-5 h-5 text-sky-400" />
          <h1 className="text-2xl font-bold text-slate-100">Datos y Tablas Auxiliares</h1>
        </div>
        <p className="text-sm text-slate-500 mt-1">
          Listas maestras reutilizables en todos los módulos de la aplicación
        </p>
      </div>

      <AuxiliaresClient
        categorias={categorias  ?? []}
        tiposActivo={tiposActivo ?? []}
        rutas={rutas            ?? []}
        equipos={equipos        ?? []}
        repuestos={repuestos    ?? []}
        assets={assets          ?? []}
        isSuperusuario={isSuperusuario}
      />
    </div>
  )
}

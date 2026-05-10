import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { getISOWeek, isoWeekLabel } from '@/lib/work-orders/utils'
import DashboardShell from '@/components/dashboard/DashboardShell'

export const dynamic = 'force-dynamic'

function getLast12Weeks() {
  const weeks = []
  const now = new Date()
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i * 7)
    const { week, year } = getISOWeek(d)
    weeks.push({ isoWeek: week, isoYear: year, label: isoWeekLabel(week, year) })
  }
  return weeks
}

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin       = createAdminClient()
  const weeks       = getLast12Weeks()
  const currentWeek = getISOWeek(new Date())

  const d84 = new Date()
  d84.setDate(d84.getDate() - 84)
  const twelveWeeksAgoISO = d84.toISOString().slice(0, 10)

  // Parallel fetch — all queries are non-blocking
  const [
    { data: assetsRaw       },
    { data: workOrdersRaw   },
    { data: avisosRaw       },
    { data: ultimasOTsRaw   },
    { data: ultimosAvisosRaw},
  ] = await Promise.all([
    admin.from('assets').select('id, status, capa, tag, nombre').limit(2000),
    admin.from('work_orders')
      .select('iso_week, iso_year, hh_prog, hhr, status, ot_number, description, fecha')
      .gte('fecha', twelveWeeksAgoISO)
      .limit(2000),
    admin.from('avisos')
      .select('id, tag, prioridad, generado_sap, created_at, iso_week, iso_year, descripcion, fecha')
      .limit(2000),
    admin.from('work_orders')
      .select('id, ot_number, description, status, fecha')
      .order('created_at', { ascending: false })
      .limit(5),
    admin.from('avisos')
      .select('id, tag, prioridad, descripcion, fecha')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const assets     = assetsRaw      ?? []
  const workOrders = workOrdersRaw  ?? []
  const avisos     = avisosRaw      ?? []

  // ── Asset KPIs ──────────────────────────────────────────────────────────────
  const totalAssets      = assets.length
  const operativos       = assets.filter((a) => a.status === 'Operativo').length
  const enMantenimiento  = assets.filter((a) => a.status === 'En mantenimiento').length
  const fueraDeServicio  = assets.filter((a) => a.status === 'Fuera de servicio').length
  const disponibilidad   = totalAssets > 0 ? Math.round((operativos / totalAssets) * 100) : 0

  // ── Avisos KPIs ─────────────────────────────────────────────────────────────
  const avisosMIPendientes = avisos.filter((a) => a.prioridad === 'MI' && !a.generado_sap).length
  const avisosBacklogSAP   = avisos.filter((a) => !a.generado_sap).length
  const avisosGenerados    = avisos.filter((a) => a.generado_sap).length

  // ── Work Order KPIs ─────────────────────────────────────────────────────────
  const otsSemana         = workOrders.filter((o) => o.iso_week === currentWeek.week && o.iso_year === currentWeek.year)
  const otsSemanaActual   = otsSemana.length
  const otsCumplidasSemana= otsSemana.filter((o) => o.status === 'cumplida').length

  const last4 = weeks.slice(-4)
  const ots4W = workOrders.filter((o) => last4.some((w) => w.isoWeek === o.iso_week && w.isoYear === o.iso_year))
  const hhProgTotal  = Math.round(ots4W.reduce((s, o) => s + Number(o.hh_prog), 0))
  const hhrTotal     = Math.round(ots4W.reduce((s, o) => s + Number(o.hhr), 0))
  const eficienciaHH = hhProgTotal > 0 ? Math.round((hhrTotal / hhProgTotal) * 100) : 0

  const otsReprogramadas = workOrders.filter((o) => o.status === 'reprogramada').length

  // ── 12-week chart data ──────────────────────────────────────────────────────
  const weeklyStats = weeks.map((w) => {
    const wOTs    = workOrders.filter((o) => o.iso_week === w.isoWeek && o.iso_year === w.isoYear)
    const wAvisos = avisos.filter((a) => a.iso_week === w.isoWeek && a.iso_year === w.isoYear)
    return {
      label:       w.label,
      hhProg:      Math.round(wOTs.reduce((s, o) => s + Number(o.hh_prog), 0)),
      hhr:         Math.round(wOTs.reduce((s, o) => s + Number(o.hhr),     0)),
      otCount:     wOTs.length,
      otCumplidas: wOTs.filter((o) => o.status === 'cumplida').length,
      avisosMI:    wAvisos.filter((a) => a.prioridad === 'MI').length,
      avisosMN:    wAvisos.filter((a) => a.prioridad === 'MN').length,
      avisosBKL:   wAvisos.filter((a) => a.prioridad === 'BKL').length,
      avisosPP:    wAvisos.filter((a) => a.prioridad === 'PP').length,
    }
  })

  // ── Alerts ──────────────────────────────────────────────────────────────────
  const alertasActivos  = assets.filter((a) => a.status === 'Fuera de servicio').slice(0, 8)
  const avisosMIActivos = avisos.filter((a) => a.prioridad === 'MI' && !a.generado_sap).slice(0, 8)

  const today = new Date().toISOString().slice(0, 10)
  const otsVencidas = workOrders.filter((o) => o.status === 'en_proceso' && o.fecha < today).length

  return (
    <div className="flex flex-col gap-6 pb-6 px-4 md:px-6">
      {/* Header */}
      <div className="shrink-0">
        <h1 className="text-2xl font-bold text-slate-100">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">
          Indicadores operacionales en tiempo real ·{' '}
          {new Date().toLocaleDateString('es-AR', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
          })}
        </p>
      </div>

      <DashboardShell
        kpis={{
          totalAssets, operativos, enMantenimiento, fueraDeServicio, disponibilidad,
          otsSemanaActual, otsCumplidasSemana,
          hhProgTotal, hhrTotal, eficienciaHH,
          avisosMIPendientes, avisosBacklogSAP, avisosGenerados,
          otsReprogramadas, otsVencidas,
        }}
        weeklyStats={weeklyStats}
        alertasActivos={alertasActivos.map((a) => ({
          id: a.id, tag: a.tag, nombre: a.nombre, status: a.status,
        }))}
        avisosMIActivos={avisosMIActivos.map((a) => ({
          id: a.id, tag: a.tag, descripcion: a.descripcion, fecha: a.fecha,
        }))}
        ultimasOTs={(ultimasOTsRaw ?? []).map((o) => ({
          id: o.id, otNumber: o.ot_number, description: o.description,
          status: o.status, fecha: o.fecha,
        }))}
        ultimosAvisos={(ultimosAvisosRaw ?? []).map((a) => ({
          id: a.id, tag: a.tag, prioridad: a.prioridad,
          descripcion: a.descripcion, fecha: a.fecha,
        }))}
      />
    </div>
  )
}

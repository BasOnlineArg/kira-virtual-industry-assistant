'use client'

import {
  Package, CheckCircle2, Wrench, XCircle, Activity,
  ClipboardList, Zap, AlertTriangle, Bell, RefreshCw,
} from 'lucide-react'

import KpiCard       from './KpiCard'
import WeeklyChart   from './WeeklyChart'
import AvisosChart   from './AvisosChart'
import AssetDonut    from './AssetDonut'
import AlertsPanel   from './AlertsPanel'
import RecentActivity from './RecentActivity'

// ── Types ────────────────────────────────────────────────────────────────────

interface Kpis {
  totalAssets:        number
  operativos:         number
  enMantenimiento:    number
  fueraDeServicio:    number
  disponibilidad:     number
  otsSemanaActual:    number
  otsCumplidasSemana: number
  hhProgTotal:        number
  hhrTotal:           number
  eficienciaHH:       number
  avisosMIPendientes: number
  avisosBacklogSAP:   number
  avisosGenerados:    number
  otsReprogramadas:   number
  otsVencidas:        number
}

interface WeekStat {
  label:       string
  hhProg:      number
  hhr:         number
  otCount:     number
  otCumplidas: number
  avisosMI:    number
  avisosMN:    number
  avisosBKL:   number
  avisosPP:    number
}

interface ActiveAsset { id: string; tag: string; nombre: string; status: string }
interface AvisoMI     { id: string; tag: string; descripcion: string; fecha: string }
interface RecentOT    { id: string; otNumber: string; description: string; status: string; fecha: string }
interface RecentAviso { id: string; tag: string; prioridad: string; descripcion: string; fecha: string }

interface Props {
  kpis:             Kpis
  weeklyStats:      WeekStat[]
  alertasActivos:   ActiveAsset[]
  avisosMIActivos:  AvisoMI[]
  ultimasOTs:       RecentOT[]
  ultimosAvisos:    RecentAviso[]
}

// ── Component ────────────────────────────────────────────────────────────────

export default function DashboardShell({
  kpis, weeklyStats, alertasActivos, avisosMIActivos, ultimasOTs, ultimosAvisos,
}: Props) {

  const {
    totalAssets, operativos, enMantenimiento, fueraDeServicio, disponibilidad,
    otsSemanaActual, otsCumplidasSemana,
    hhProgTotal, hhrTotal, eficienciaHH,
    avisosMIPendientes, avisosBacklogSAP, avisosGenerados,
    otsReprogramadas, otsVencidas,
  } = kpis

  const alertCount = alertasActivos.length + avisosMIActivos.length

  return (
    <div className="flex flex-col gap-6">

      {/* ── Block 1: KPI cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">

        {/* Assets */}
        <KpiCard
          label="Total activos"
          value={totalAssets}
          sub={`${disponibilidad}% disponibilidad`}
          icon={Package}
          variant="default"
        />
        <KpiCard
          label="Operativos"
          value={operativos}
          sub="activos en servicio"
          icon={CheckCircle2}
          variant="success"
        />
        <KpiCard
          label="En mantenimiento"
          value={enMantenimiento}
          sub="intervención activa"
          icon={Wrench}
          variant="warning"
        />
        <KpiCard
          label="Fuera de servicio"
          value={fueraDeServicio}
          sub="requieren atención"
          icon={XCircle}
          variant={fueraDeServicio > 0 ? 'danger' : 'default'}
          pulse={fueraDeServicio > 0}
        />

        {/* OT semana actual */}
        <KpiCard
          label="OTs esta semana"
          value={otsCumplidasSemana}
          sub={`de ${otsSemanaActual} programadas`}
          icon={ClipboardList}
          variant={otsSemanaActual > 0 && otsCumplidasSemana === otsSemanaActual ? 'success' : 'info'}
        />

      </div>

      {/* ── Second row of KPIs ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">

        <KpiCard
          label="Eficiencia HH"
          value={eficienciaHH}
          unit="%"
          sub={`${hhrTotal} / ${hhProgTotal} HH · 4 sem`}
          icon={Zap}
          variant={eficienciaHH >= 90 ? 'success' : eficienciaHH >= 70 ? 'warning' : 'danger'}
        />
        <KpiCard
          label="Avisos MI pendientes"
          value={avisosMIPendientes}
          sub="sin generar en SAP"
          icon={AlertTriangle}
          variant={avisosMIPendientes > 0 ? 'danger' : 'success'}
          pulse={avisosMIPendientes > 0}
        />
        <KpiCard
          label="Backlog avisos"
          value={avisosBacklogSAP}
          sub="sin generar en SAP"
          icon={Bell}
          variant={avisosBacklogSAP > 5 ? 'warning' : 'default'}
        />
        <KpiCard
          label="Avisos generados SAP"
          value={avisosGenerados}
          sub="enviados al sistema"
          icon={Activity}
          variant="info"
        />
        <KpiCard
          label="OTs reprogramadas"
          value={otsReprogramadas}
          sub={`${otsVencidas} vencidas`}
          icon={RefreshCw}
          variant={otsReprogramadas > 0 ? 'warning' : 'default'}
        />

      </div>

      {/* ── Block 2: Charts ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

        {/* HH chart — takes 2/3 on xl, full width on md */}
        <div className="md:col-span-2 xl:col-span-2 rounded-2xl border border-slate-700/50 bg-slate-800/40 p-4 flex flex-col gap-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            HH Programadas vs HHR — últimas 12 semanas
          </h2>
          <div className="h-40 sm:h-56">
            <WeeklyChart data={weeklyStats} />
          </div>
        </div>

        {/* Asset donut — takes 1/3 */}
        <div className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-4 flex flex-col gap-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Estado de activos
          </h2>
          <div className="flex-1 flex items-center justify-center">
            <AssetDonut
              operativos={operativos}
              enMantenimiento={enMantenimiento}
              fueraDeServicio={fueraDeServicio}
            />
          </div>
        </div>

      </div>

      {/* Avisos stacked chart */}
      <div className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-4 flex flex-col gap-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Avisos por prioridad — últimas 12 semanas
        </h2>
        <div className="h-40 sm:h-52">
          <AvisosChart data={weeklyStats} />
        </div>
      </div>

      {/* ── Block 3: Alerts + Recent Activity ───────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

        {/* Alerts panel — 1/3 */}
        <div className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Alertas activas
            </h2>
            {alertCount > 0 && (
              <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-400">
                {alertCount}
              </span>
            )}
          </div>
          <AlertsPanel
            alertasActivos={alertasActivos}
            avisosMIActivos={avisosMIActivos}
          />
        </div>

        {/* Recent activity — 2/3 on xl, 1/2 on md */}
        <div className="xl:col-span-2">
          <RecentActivity
            ultimasOTs={ultimasOTs}
            ultimosAvisos={ultimosAvisos}
          />
        </div>

      </div>

    </div>
  )
}

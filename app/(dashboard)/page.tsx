import {
  Brain,
  Camera,
  Activity,
  Gauge,
  Building2,
  MapPin,
  ClipboardList,
  Bell,
  BookOpen,
  Settings,
  LayoutDashboard,
  Database,
  GitBranch,
  CalendarRange,
  ShieldCheck,
  CheckCircle2,
  Clock,
  type LucideIcon,
} from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

type ModuleStatus = 'complete' | 'next' | 'planned' | 'base'

interface ModuleCard {
  id:          number
  href:        string
  icon:        LucideIcon
  label:       string
  description: string
  status:      ModuleStatus
}

const modules: ModuleCard[] = [
  // ── Módulos funcionales ───────────────────────────────────────────────────
  {
    id: 1,
    href: '/research',
    icon: Brain,
    label: 'AI Research',
    description: 'Chat con Claude API especializado en ingeniería de mantenimiento. Sesiones persistidas por usuario.',
    status: 'complete',
  },
  {
    id: 2,
    href: '/visual-inspection',
    icon: Camera,
    label: 'Inspección Visual',
    description: 'Diagnóstico por visión artificial de imágenes térmicas y de campo. Severidad ALTA/MEDIA/BAJA.',
    status: 'complete',
  },
  {
    id: 3,
    href: '/audio-vibration',
    icon: Activity,
    label: 'Audio & Vibración',
    description: 'Pipeline DSP completo: TWF → FFT → PSD → AEA → Kurtosis → RMS. Análisis Sonomat.',
    status: 'complete',
  },
  {
    id: 4,
    href: '/skf',
    icon: Gauge,
    label: 'SKF QuickCollect',
    description: 'Velocity RMS + Envelope gE. Evaluación ISO 10816. Input Bluetooth o CSV/XLSX.',
    status: 'complete',
  },
  {
    id: 5,
    href: '/structural-inspections',
    icon: Building2,
    label: 'Insp. Estructurales',
    description: 'Inspecciones por sector con scoring de criticidad (máx. 125). FRM y OT SAP integrados.',
    status: 'complete',
  },
  {
    id: 6,
    href: '/geo',
    icon: MapPin,
    label: 'Geolocalización',
    description: 'Vista satelital superficie + planos subterráneos calibrados. 4 minas con pins de estado.',
    status: 'complete',
  },
  {
    id: 7,
    href: '/work-orders',
    icon: ClipboardList,
    label: 'Órdenes de Trabajo',
    description: 'KPIs HH programadas vs reales. Import XLSX formato SAP. OT de 8 dígitos.',
    status: 'complete',
  },
  {
    id: 8,
    href: '/notices',
    icon: Bell,
    label: 'Avisos de Mantenimiento',
    description: 'Prioridades SAP: MN / MI / BKL / PP. Vinculado a TAG de activo.',
    status: 'complete',
  },
  {
    id: 9,
    href: '/manuals',
    icon: BookOpen,
    label: 'Biblioteca Manuales',
    description: 'RAG con FTS PostgreSQL sobre documentos cargados. Manuales OEM + Pautas de mantenimiento.',
    status: 'complete',
  },
  {
    id: 10,
    href: '/dashboard',
    icon: LayoutDashboard,
    label: 'Dashboard',
    description: 'KPIs operacionales en tiempo real. HH, eficiencia, estado de activos, avisos y alertas.',
    status: 'complete',
  },
  {
    id: 11,
    href: '/auxiliares',
    icon: Database,
    label: 'Datos y Tablas Auxiliares',
    description: 'Listas maestras: categorías, tipos, rutas, equipos, repuestos SAP y programa Gantt.',
    status: 'complete',
  },
  {
    id: 12,
    href: '/rca',
    icon: GitBranch,
    label: 'Análisis RCA',
    description: 'Diagrama Ishikawa 3D con 9 categorías + análisis IA. Causa raíz, acciones correctivas, línea de tiempo e informe PDF.',
    status: 'complete',
  },
  {
    id: 13,
    href: '/inspection-plan',
    icon: CalendarRange,
    label: 'Programa de Inspecciones',
    description: 'Gantt 2026–2027 con 420 activos × 56 semanas + rutas de inspección por zona. Inspector único, régimen 14×14.',
    status: 'complete',
  },
  {
    id: 14,
    href: '/admin',
    icon: Settings,
    label: 'Administración',
    description: 'Invitación de usuarios vía Supabase Auth y audit log tamper-proof. Solo superusuario.',
    status: 'complete',
  },
]

const statusConfig: Record<ModuleStatus, { label: string; className: string; icon: LucideIcon }> = {
  complete: {
    label: 'Disponible',
    className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    icon: CheckCircle2,
  },
  next: {
    label: 'En desarrollo',
    className: 'bg-sky-500/15 text-sky-400 border-sky-500/20',
    icon: Clock,
  },
  planned: {
    label: 'Planificado',
    className: 'bg-slate-700/50 text-slate-400 border-slate-600/30',
    icon: Clock,
  },
  base: {
    label: 'Infraestructura base',
    className: 'bg-violet-500/15 text-violet-400 border-violet-500/20',
    icon: ShieldCheck,
  },
}

export default async function HomePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('name, role')
    .eq('id', user.id)
    .single()

  const greeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Buenos días'
    if (hour < 18) return 'Buenas tardes'
    return 'Buenas noches'
  }

  const functional = modules.filter((m) => m.status !== 'base')
  const completed  = functional.filter((m) => m.status === 'complete').length

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-slate-500 text-sm">{greeting()},</span>
          <span className="text-slate-300 text-sm font-medium">{userData?.name ?? 'Inspector'}</span>
        </div>
        <h1 className="text-2xl font-semibold text-slate-100">KIRA — Asistente Industrial</h1>
        <p className="text-slate-400 mt-1 text-sm">
          Sistema de Mantenimiento Predictivo · Operación Minera Patagonia
        </p>
      </div>

      {/* Progress banner */}
      <div className="kira-card p-4 mb-6 flex items-center gap-4 border-emerald-500/20 bg-emerald-500/5">
        <div className="w-10 h-10 bg-emerald-500/15 rounded-lg flex items-center justify-center flex-shrink-0">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-200">
            {completed} de {functional.length} módulos funcionales disponibles
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            Infraestructura base + M1–M14 funcionales sobre Supabase, Next.js 14 y Claude API.
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-2xl font-bold text-emerald-400">
            {Math.round((completed / functional.length) * 100)}%
          </p>
          <p className="text-[11px] text-slate-500">completado</p>
        </div>
      </div>

      {/* Module grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {modules.map((mod) => {
          const StatusIcon = statusConfig[mod.status].icon
          const ModIcon    = mod.icon
          const isBase     = mod.status === 'base'

          const cardContent = (
            <>
              <div className="flex items-start justify-between mb-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors
                  ${isBase
                    ? 'bg-violet-500/10'
                    : 'bg-slate-800 group-hover:bg-slate-700'
                  }`}>
                  <ModIcon className={`w-5 h-5 transition-colors
                    ${isBase
                      ? 'text-violet-400'
                      : 'text-slate-400 group-hover:text-slate-300'
                    }`} />
                </div>
                <span className={`kira-badge border ${statusConfig[mod.status].className} flex items-center gap-1`}>
                  <StatusIcon className="w-3 h-3" />
                  {statusConfig[mod.status].label}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-slate-200 mb-1.5">
                {isBase ? 'Base · ' : `M${mod.id} · `}{mod.label}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{mod.description}</p>
            </>
          )

          if (isBase) {
            return (
              <div
                key={mod.id}
                className="kira-card p-5 border-violet-500/20 bg-violet-500/5 cursor-default"
              >
                {cardContent}
              </div>
            )
          }

          return (
            <Link
              key={mod.id}
              href={mod.href}
              className="kira-card p-5 hover:border-slate-600/70 hover:bg-slate-800/50 transition-all group"
            >
              {cardContent}
            </Link>
          )
        })}
      </div>

      <p className="text-center text-xs text-slate-700 mt-8">
        KIRA v0.1 · ~360 activos · 4 minas + superficie · ISO 10816, ASME B30, API 653
      </p>
    </div>
  )
}

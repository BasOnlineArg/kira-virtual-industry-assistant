import { createClient } from '@/lib/supabase/server'
import { redirect }     from 'next/navigation'
import RcaClient        from '@/components/rca/RcaClient'

export const dynamic = 'force-dynamic'

export default async function RcaPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users').select('name').eq('id', user.id).single()

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-slate-800 shrink-0 flex items-center gap-3">
        <div>
          <h1 className="text-base font-semibold text-slate-100 leading-tight">
            Análisis RCA
          </h1>
          <p className="text-[11px] text-slate-500">
            Análisis de Causa Raíz · 5W2H + Ishikawa 9M + IA
          </p>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 overflow-auto">
        <RcaClient userName={userData?.name ?? user.email ?? 'Inspector'} />
      </div>
    </div>
  )
}

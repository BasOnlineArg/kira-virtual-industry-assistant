import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import AudioVibrationClient from '@/components/audio-vibration/AudioVibrationClient'
import type { AudioAnalysisRow } from '@/components/audio-vibration/AudioHistory'

export const dynamic = 'force-dynamic'

export default async function AudioVibrationPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  let history: AudioAnalysisRow[] = []
  if (user) {
    const admin = createAdminClient()
    const { data } = await admin
      .from('audio_analyses')
      .select(`
        id,
        asset_tag,
        tipo_equipo,
        kurtosis,
        crest_factor,
        falla_prob,
        rul,
        diagnostico,
        fecha,
        inspector_id,
        rms,
        aea_level,
        peak_freq
      `)
      .order('fecha', { ascending: false })
      .limit(50)

    history = (data ?? []) as AudioAnalysisRow[]
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 mb-6">
        <h1 className="text-2xl font-bold text-slate-100">Análisis de Audio y Vibración</h1>
        <p className="text-sm text-slate-500 mt-1">
          Pipeline DSP · TWF · FFT · PSD Welch · AEA · Kurtosis · Diagnóstico KIRA
        </p>
      </div>

      <AudioVibrationClient initialHistory={history} />
    </div>
  )
}

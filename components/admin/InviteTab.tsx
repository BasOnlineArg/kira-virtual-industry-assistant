'use client'

import { useState } from 'react'
import { Send, CheckCircle2, UserPlus } from 'lucide-react'

type Role = 'superusuario' | 'supervisor' | 'inspector'

export default function InviteTab() {
  const [email,   setEmail]   = useState('')
  const [role,    setRole]    = useState<Role>('inspector')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error,   setError]   = useState<string | null>(null)

  async function handleInvite() {
    if (!email.trim()) return
    setError(null)
    setSuccess(null)
    setLoading(true)

    const res = await fetch('/api/admin/invite', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email: email.trim(), role }),
    })

    const body = await res.json()

    if (res.ok) {
      setSuccess(`Invitación enviada a ${body.email} con rol ${body.role}.`)
      setEmail('')
    } else {
      setError(body.error ?? 'Error al enviar la invitación.')
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-col gap-6 max-w-lg">

      {/* Explanation */}
      <div className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-4">
        <div className="flex items-start gap-3">
          <UserPlus className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-slate-200 mb-1">Invitar nuevo usuario</p>
            <p className="text-xs text-slate-500 leading-relaxed">
              Supabase enviará automáticamente un email con el link de activación.
              Una vez que el usuario acepte, su cuenta quedará activa con el rol asignado.
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-5 flex flex-col gap-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Datos del invitado
        </p>

        <div className="flex flex-col gap-2">
          <label className="text-xs text-slate-500">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
            placeholder="usuario@empresa.com"
            className="rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-200
                       placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs text-slate-500">Rol</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className="rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-300
                       focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            <option value="inspector">Inspector — puede crear análisis e inspecciones</option>
            <option value="supervisor">Supervisor — lectura y escritura en módulos operacionales</option>
            <option value="superusuario">Superusuario — acceso total y administración</option>
          </select>
        </div>

        <button
          onClick={handleInvite}
          disabled={loading || !email.trim()}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500
                     disabled:opacity-50 text-white text-sm font-medium transition-colors"
        >
          <Send className="w-4 h-4" />
          {loading ? 'Enviando...' : 'Enviar invitación'}
        </button>

        {/* Feedback */}
        {success && (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <p className="text-sm text-emerald-300">{success}</p>
          </div>
        )}
        {error && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}
      </div>

      <p className="text-xs text-slate-600">
        Los usuarios invitados aparecen en la pestaña Usuarios con estado <span className="text-slate-500">inactivo</span> hasta que acepten la invitación.
      </p>

    </div>
  )
}

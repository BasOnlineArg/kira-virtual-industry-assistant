'use client'

import { useState } from 'react'
import { Plus, Trash2, Mail } from 'lucide-react'
import { cn } from '@/lib/utils'

type Role = 'superusuario' | 'supervisor' | 'inspector'

interface WhitelistEntry {
  id:           string
  email:        string
  role_default: Role
  created_at:   string
}

const ROLE_STYLES: Record<Role, string> = {
  superusuario: 'bg-violet-500/15 text-violet-400',
  supervisor:   'bg-sky-500/15    text-sky-400',
  inspector:    'bg-slate-600/40  text-slate-300',
}

export default function WhitelistTab({ initialList }: { initialList: WhitelistEntry[] }) {
  const [list, setList]       = useState(initialList)
  const [email, setEmail]     = useState('')
  const [role, setRole]       = useState<Role>('inspector')
  const [saving, setSaving]   = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError]     = useState('')

  async function handleAdd() {
    if (!email.trim()) return
    setError('')
    setSaving(true)
    const res = await fetch('/api/admin/whitelist', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email: email.trim(), role_default: role }),
    })
    if (res.ok) {
      const entry = await res.json()
      setList((prev) => [entry, ...prev])
      setEmail('')
    } else {
      const { error: msg } = await res.json()
      setError(msg?.includes('unique') ? 'Ese email ya está en la whitelist.' : msg)
    }
    setSaving(false)
  }

  async function handleDelete(id: string, emailVal: string) {
    setDeleting(id)
    const res = await fetch('/api/admin/whitelist', {
      method:  'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id, email: emailVal }),
    })
    if (res.ok) setList((prev) => prev.filter((e) => e.id !== id))
    setDeleting(null)
  }

  return (
    <div className="flex flex-col gap-4">

      {/* Add form */}
      <div className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-4 flex flex-col gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Agregar email autorizado
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="usuario@empresa.com"
            className="flex-1 rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-200
                       placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className="rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-300
                       focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            <option value="inspector">Inspector</option>
            <option value="supervisor">Supervisor</option>
            <option value="superusuario">Superusuario</option>
          </select>
          <button
            onClick={handleAdd}
            disabled={saving || !email.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500
                       disabled:opacity-50 text-white text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Agregar
          </button>
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>

      {/* List */}
      <div className="overflow-x-auto">
        <div className="flex flex-col gap-2 min-w-[320px]">
          {list.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-8">Whitelist vacía — ningún email autorizado.</p>
          )}
          {list.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center gap-3 rounded-xl border border-slate-700/40 bg-slate-800/30 px-4 py-2.5"
            >
              <Mail className="w-4 h-4 text-slate-500 shrink-0" />
              <span className="flex-1 text-sm text-slate-300 truncate">{entry.email}</span>
              <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0', ROLE_STYLES[entry.role_default])}>
                {entry.role_default}
              </span>
              <span className="text-[11px] text-slate-600 shrink-0">
                {new Date(entry.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
              </span>
              <button
                onClick={() => handleDelete(entry.id, entry.email)}
                disabled={deleting === entry.id}
                className="shrink-0 p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}

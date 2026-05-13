'use client'

import { useState } from 'react'
import { Users, ListChecks, UserPlus } from 'lucide-react'
import { cn } from '@/lib/utils'
import UsersTab    from './UsersTab'
import InviteTab   from './InviteTab'
import AuditLogTab from './AuditLogTab'

type Tab = 'usuarios' | 'invitar' | 'audit'

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'usuarios', label: 'Usuarios',         icon: Users    },
  { id: 'invitar',  label: 'Invitar Usuario',  icon: UserPlus },
  { id: 'audit',    label: 'Audit Log',        icon: ListChecks },
]

interface Props {
  initialUsers: any[]
  initialLogs:  any[]
}

export default function AdminClient({ initialUsers, initialLogs }: Props) {
  const [tab, setTab] = useState<Tab>('usuarios')

  return (
    <div className="flex flex-col gap-6">

      {/* Tab bar */}
      <div className="overflow-x-auto">
        <div className="flex gap-1 bg-slate-800/60 border border-slate-700/50 rounded-2xl p-1 w-max min-w-full">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap shrink-0 transition-all',
                tab === t.id
                  ? 'bg-sky-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50',
              )}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div>
        {tab === 'usuarios' && <UsersTab    initialUsers={initialUsers} />}
        {tab === 'invitar'  && <InviteTab />}
        {tab === 'audit'    && <AuditLogTab initialLogs={initialLogs} />}
      </div>

    </div>
  )
}

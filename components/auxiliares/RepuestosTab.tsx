'use client'

import { useState, useRef } from 'react'
import { Plus, Trash2, Upload, Search, Package } from 'lucide-react'
import * as XLSX from 'xlsx'

interface Repuesto {
  id:          string
  codigo_sap:  string
  descripcion: string
  unidad:      string
  cantidad:    number | null
  ubicacion:   string
}

const EMPTY = { codigo_sap: '', descripcion: '', unidad: '', cantidad: '', ubicacion: '' }

export default function RepuestosTab({ initialItems }: { initialItems: Repuesto[] }) {
  const [items, setItems]     = useState(initialItems)
  const [open, setOpen]       = useState(false)
  const [form, setForm]       = useState(EMPTY)
  const [saving, setSaving]   = useState(false)
  const [importing, setImporting] = useState(false)
  const [search, setSearch]   = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function setField(k: string, v: string) { setForm((p) => ({ ...p, [k]: v })) }

  async function handleSave() {
    if (!form.descripcion.trim()) return
    setSaving(true)
    const res = await fetch('/api/auxiliares?tabla=repuestos', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        cantidad: form.cantidad ? parseInt(form.cantidad) : null,
      }),
    })
    if (res.ok) {
      const item = await res.json()
      setItems((p) => [item, ...p])
      setForm(EMPTY)
      setOpen(false)
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    const res = await fetch('/api/auxiliares?tabla=repuestos', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (res.ok) setItems((p) => p.filter((i) => i.id !== id))
    setDeleting(null)
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)

    const data   = await file.arrayBuffer()
    const wb     = XLSX.read(data)
    const ws     = wb.Sheets[wb.SheetNames[0]]
    const rows   = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws)

    const mapped = rows.map((r) => ({
      codigo_sap:  String(r['Código SAP'] ?? r['Codigo SAP'] ?? r['codigo_sap'] ?? ''),
      descripcion: String(r['Descripción'] ?? r['Descripcion'] ?? r['descripcion'] ?? ''),
      unidad:      String(r['Unidad'] ?? r['unidad'] ?? ''),
      cantidad:    r['Cantidad'] != null ? Number(r['Cantidad']) : null,
      ubicacion:   String(r['Ubicación'] ?? r['Ubicacion'] ?? r['ubicacion'] ?? ''),
    })).filter((r) => r.descripcion)

    // Bulk insert batches of 50
    const results: Repuesto[] = []
    for (let i = 0; i < mapped.length; i += 50) {
      const batch = mapped.slice(i, i + 50)
      const res = await fetch('/api/auxiliares?tabla=repuestos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batch),
      })
      if (res.ok) {
        const saved = await res.json()
        results.push(...(Array.isArray(saved) ? saved : [saved]))
      }
    }
    setItems((p) => [...results, ...p])
    setImporting(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const filtered = items.filter((r) => {
    const q = search.toLowerCase()
    return !q || [r.codigo_sap, r.descripcion, r.ubicacion].some((f) => f?.toLowerCase().includes(q))
  })

  return (
    <div className="flex flex-col gap-4">

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por código, descripción, ubicación..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm
                       text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>
        <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={importing}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-600 hover:border-slate-500
                     text-slate-300 hover:text-white text-sm transition-colors disabled:opacity-50"
        >
          <Upload className="w-4 h-4" />
          {importing ? 'Importando...' : 'Importar XLSX'}
        </button>
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> Nuevo repuesto
        </button>
      </div>

      <p className="text-[11px] text-slate-500">{filtered.length} repuesto{filtered.length !== 1 ? 's' : ''}{search && ` de ${items.length} total`}</p>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-lg shadow-xl flex flex-col gap-4">
            <h3 className="text-base font-semibold text-slate-100">Nuevo repuesto</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { key: 'codigo_sap',  label: 'Código SAP',   placeholder: 'Ej: 10023456', full: false },
                { key: 'unidad',      label: 'Unidad',        placeholder: 'Ej: UN, KG, M', full: false },
                { key: 'descripcion', label: 'Descripción *', placeholder: 'Descripción del repuesto', full: true },
                { key: 'ubicacion',   label: 'Ubicación',     placeholder: 'Rack / depósito', full: false },
                { key: 'cantidad',    label: 'Cantidad',      placeholder: '0', full: false },
              ].map((f) => (
                <div key={f.key} className={f.full ? 'col-span-2' : ''}>
                  <label className="text-[11px] text-slate-400 uppercase tracking-wider">{f.label}</label>
                  <input
                    value={form[f.key as keyof typeof form]}
                    onChange={(e) => setField(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    type={f.key === 'cantidad' ? 'number' : 'text'}
                    className="mt-1 w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-sm
                               text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setOpen(false)} className="px-4 py-2 rounded-xl text-slate-400 hover:text-slate-200 text-sm">Cancelar</button>
              <button
                onClick={handleSave}
                disabled={saving || !form.descripcion.trim()}
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-700/50">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700/50 bg-slate-800/60">
              {['Código SAP', 'Descripción', 'Unidad', 'Cantidad', 'Ubicación', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/30">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-500 text-sm">
                  <Package className="w-6 h-6 mx-auto mb-2 opacity-30" />
                  Sin repuestos
                </td>
              </tr>
            )}
            {filtered.map((r) => (
              <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                <td className="px-4 py-2.5 font-mono text-xs text-slate-400">{r.codigo_sap || '—'}</td>
                <td className="px-4 py-2.5 text-slate-200 max-w-[280px] truncate">{r.descripcion}</td>
                <td className="px-4 py-2.5 text-slate-400 text-xs">{r.unidad || '—'}</td>
                <td className="px-4 py-2.5 text-slate-400 text-xs tabular-nums">{r.cantidad ?? '—'}</td>
                <td className="px-4 py-2.5 text-slate-400 text-xs">{r.ubicacion || '—'}</td>
                <td className="px-4 py-2.5">
                  <button
                    onClick={() => handleDelete(r.id)}
                    disabled={deleting === r.id}
                    className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

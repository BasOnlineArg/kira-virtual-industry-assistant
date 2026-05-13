import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// ── Cell helpers ──────────────────────────────────────────────────────────────

function getCell(ws: XLSX.WorkSheet, row: number, col: number) {
  return ws[XLSX.utils.encode_cell({ r: row, c: col })]
}
function str(ws: XLSX.WorkSheet, row: number, col: number): string {
  if (col < 0) return ''
  const c = getCell(ws, row, col)
  return c ? String(c.v ?? '').trim() : ''
}
function num(ws: XLSX.WorkSheet, row: number, col: number): number | null {
  if (col < 0) return null
  const c = getCell(ws, row, col)
  if (!c) return null
  const n = Number(c.v)
  return isNaN(n) ? null : n
}

// ── Column detection ──────────────────────────────────────────────────────────
// Estructura del Excel (fila 3, 0-indexed row 2):
//   A: N°  | B: Categoría | C: Código | D: Equipo | E: Ub. Técnica
//   F: Ubicación Física | G: ÁREA | H: Ruta / Zona
//   I: Frec.(sem) | J: HH Ocurr. | K: HH Anual

const COL_DEFS: { key: string; keywords: string[] }[] = [
  { key: 'num',          keywords: ['n°', 'n.', 'nro', 'num', '#'] },
  { key: 'categoria',    keywords: ['categoría', 'categoria', 'category', 'tipo'] },
  { key: 'codigo',       keywords: ['código', 'codigo', 'cod.', 'code'] },
  { key: 'equipo',       keywords: ['equipo', 'nombre', 'descripción', 'descripcion', 'name', 'asset'] },
  { key: 'ub_tecnica',   keywords: ['ub. técnica', 'ub técnica', 'ub.técnica', 'ubtécnica', 'técnica', 'tecnica', 'fl sap', 'funcional', 'ubicación técnica', 'ubicacion tecnica'] },
  { key: 'ubic_fisica',  keywords: ['ubicación física', 'ubicacion fisica', 'ubic. física', 'ubic física', 'ubicación f', 'física', 'fisica'] },
  { key: 'area',         keywords: ['área', 'area', 'sector', 'zona'] },
  { key: 'ruta',         keywords: ['ruta', 'ruta / zona', 'ruta/zona', 'route'] },
  { key: 'frec_sem',     keywords: ['frec', 'frecuencia', 'freq'] },
  { key: 'hh_ocurr',     keywords: ['hh ocurr', 'hh/ocurr', 'ocurr', 'hh oc'] },
  { key: 'hh_anual',     keywords: ['hh anual', 'anual', 'hh/año', 'hh año'] },
]

interface ColMap { [key: string]: number }

function findHeaderRow(ws: XLSX.WorkSheet, range: XLSX.Range): { row: number; cols: ColMap } | null {
  for (let r = 0; r <= Math.min(10, range.e.r); r++) {
    const colMap: ColMap = {}

    for (let c = 0; c <= range.e.c; c++) {
      const cell = getCell(ws, r, c)
      if (!cell) continue
      const val = String(cell.v ?? '').toLowerCase().trim()
      if (!val) continue

      for (const { key, keywords } of COL_DEFS) {
        if (colMap[key] !== undefined) continue // already found
        if (keywords.some((kw) => val.includes(kw))) {
          colMap[key] = c
        }
      }
    }

    // Valid header must have at least 'equipo' column
    if (colMap['equipo'] !== undefined) {
      // Fill missing cols with -1
      for (const { key } of COL_DEFS) {
        if (colMap[key] === undefined) colMap[key] = -1
      }
      return { row: r, cols: colMap }
    }
  }
  return null
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: userData } = await supabase
    .from('users').select('role').eq('id', user.id).single()
  if (userData?.role !== 'superusuario') {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  try {
    const formData = await req.formData()
    const file     = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No se recibió archivo' }, { status: 400 })

    const buffer = await file.arrayBuffer()
    const wb     = XLSX.read(buffer)

    // Prefer sheet named "registro" or "activos", else first sheet
    const sheetName =
      wb.SheetNames.find((n) => n.toLowerCase().includes('registro')) ??
      wb.SheetNames.find((n) => n.toLowerCase().includes('activos'))  ??
      wb.SheetNames[0]

    console.log('[AssetsImport] Sheet:', sheetName, '| All:', wb.SheetNames)

    const ws    = wb.Sheets[sheetName]
    const ref   = ws['!ref']
    if (!ref) return NextResponse.json({ error: 'Hoja vacía' }, { status: 422 })
    const range = XLSX.utils.decode_range(ref)

    const header = findHeaderRow(ws, range)
    if (!header) {
      return NextResponse.json({
        error: `No se encontró columna "Equipo" en las primeras 10 filas. Hoja: "${sheetName}". Hojas: ${wb.SheetNames.join(', ')}`,
      }, { status: 422 })
    }

    console.log('[AssetsImport] Header row:', header.row, '| Cols:', header.cols)

    const toUpsert: Record<string, unknown>[] = []
    const seenTags = new Set<string>()

    for (let r = header.row + 1; r <= range.e.r; r++) {
      const equipo     = str(ws, r, header.cols['equipo'])
      const ubTecnica  = str(ws, r, header.cols['ub_tecnica'])
      const codigo     = str(ws, r, header.cols['codigo'])
      const rowNum     = num(ws, r, header.cols['num'])

      // Skip rows with no equipment name
      if (!equipo) continue

      // Skip rows where equipo looks like a section header (very long or special chars)
      if (equipo.length > 100 || /^[▶►\-=*#]/.test(equipo)) continue

      // Determine TAG priority: Ub. Técnica > Código > N°+Equipo
      let tag = ubTecnica || codigo
      if (!tag) {
        // Generate stable synthetic tag from row number + first word of equipo
        const prefix = rowNum != null ? String(rowNum).padStart(4, '0') : String(r).padStart(4, '0')
        const slug   = equipo.slice(0, 20).replace(/\s+/g, '_').toUpperCase()
        tag = `${prefix}_${slug}`
      }

      // Dedupe
      if (seenTags.has(tag)) continue
      seenTags.add(tag)

      const categoria   = str(ws, r, header.cols['categoria'])
      const ubicFisica  = str(ws, r, header.cols['ubic_fisica'])
      const area        = str(ws, r, header.cols['area'])
      const ruta        = str(ws, r, header.cols['ruta'])
      const frecSem     = num(ws, r, header.cols['frec_sem'])
      const hhOcurr     = num(ws, r, header.cols['hh_ocurr'])
      const hhAnual     = num(ws, r, header.cols['hh_anual'])

      toUpsert.push({
        tag,
        nombre:          equipo,
        tipo:            categoria || 'Sin categoría',
        capa:            'subterraneo',
        sector:          area || null,
        status:          'Operativo',
        // Extra columns
        ub_tecnica:      ubTecnica  || null,
        ubicacion_fisica: ubicFisica || null,
        ruta_zona:       ruta       || null,
        frec_sem:        frecSem,
        hh_ocurr:        hhOcurr,
        hh_anual:        hhAnual,
      })
    }

    console.log('[AssetsImport] Parsed:', toUpsert.length, '| Sample:', JSON.stringify(toUpsert[0]))

    if (toUpsert.length === 0) {
      return NextResponse.json({
        error: `No se encontraron activos en la hoja "${sheetName}".`,
        debug: { headerRow: header.row, cols: header.cols },
      }, { status: 422 })
    }

    const admin = createAdminClient()

    // Upsert in batches of 200
    const BATCH = 200
    let upserted = 0
    for (let i = 0; i < toUpsert.length; i += BATCH) {
      const batch = toUpsert.slice(i, i + BATCH)
      const { error } = await admin
        .from('assets')
        .upsert(batch, { onConflict: 'tag', ignoreDuplicates: false })

      if (error) {
        console.error('[AssetsImport] upsert error batch', i, ':', error)
        return NextResponse.json({ error: error.message, batch: i }, { status: 500 })
      }
      upserted += batch.length
    }

    return NextResponse.json({ upserted, parsed: toUpsert.length, sheet: sheetName })

  } catch (err) {
    console.error('[AssetsImport] error', err)
    return NextResponse.json({
      error: `Error procesando el archivo: ${err instanceof Error ? err.message : String(err)}`,
    }, { status: 500 })
  }
}

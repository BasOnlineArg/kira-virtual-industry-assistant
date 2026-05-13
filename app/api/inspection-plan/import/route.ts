import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// ── XLSX helpers ──────────────────────────────────────────────────────────────

function getCell(ws: XLSX.WorkSheet, row: number, col: number): XLSX.CellObject | undefined {
  return ws[XLSX.utils.encode_cell({ r: row, c: col })]
}

function getString(ws: XLSX.WorkSheet, row: number, col: number): string {
  const cell = getCell(ws, row, col)
  return cell ? String(cell.v ?? '').trim() : ''
}

function getNum(ws: XLSX.WorkSheet, row: number, col: number): number {
  const cell = getCell(ws, row, col)
  if (!cell) return 0
  const n = Number(cell.v)
  return isNaN(n) ? 0 : n
}

// ── Parse Gantt sheet ─────────────────────────────────────────────────────────
// Structure (0-indexed rows):
//   Row 0: Title
//   Row 1: N°, Categoría, Código, Equipo, Área, Ruta/Zona, HH, [months merged]
//   Row 2: (fixed cols empty), S19, S20, ... S52, S1, ... S22
//   Row 3: (fixed cols empty), 04/05, 11/05, ...
//   Row 4+: either section header ("▶ RUTA...") or asset row (col0 = number)

const FIXED_COLS = 7 // N°, Categoría, Código, Equipo, Área, Ruta/Zona, HH

interface WeekKey { week: number; year: number }

interface ParsedItem {
  asset_num:       number
  categoria:       string
  codigo:          string
  equipo:          string
  area:            string
  ruta:            string
  hh:              number
  scheduled_weeks: WeekKey[]
}

function parseGanttSheet(ws: XLSX.WorkSheet): { items: ParsedItem[]; debug: Record<string, unknown> } {
  const ref = ws['!ref']
  if (!ref) return { items: [], debug: { error: 'No ref in worksheet' } }
  const range = XLSX.utils.decode_range(ref)

  const debug: Record<string, unknown> = {
    range: `${range.s.r}:${range.s.c} → ${range.e.r}:${range.e.c}`,
    totalRows: range.e.r + 1,
    totalCols: range.e.c + 1,
  }

  // Log first few rows to understand structure
  const sampleRows: Record<string, string>[] = []
  for (let row = 0; row <= Math.min(4, range.e.r); row++) {
    const rowData: Record<string, string> = {}
    for (let col = 0; col <= Math.min(9, range.e.c); col++) {
      const cell = getCell(ws, row, col)
      if (cell) rowData[`c${col}`] = String(cell.v ?? '')
    }
    sampleRows.push(rowData)
  }
  debug.sampleRows = sampleRows

  // Scan all rows to find the first row where col0 looks like a week header (S19, S20...)
  // The week header row might not always be row 2 — scan to find it
  let weekHeaderRow = -1
  for (let row = 0; row <= Math.min(10, range.e.r); row++) {
    let weekFound = 0
    for (let col = FIXED_COLS; col <= Math.min(FIXED_COLS + 10, range.e.c); col++) {
      const cell = getCell(ws, row, col)
      if (cell && String(cell.v ?? '').match(/S\d+/i)) weekFound++
    }
    if (weekFound >= 3) { weekHeaderRow = row; break }
  }
  debug.weekHeaderRow = weekHeaderRow

  if (weekHeaderRow === -1) {
    // Fallback: try row 2
    weekHeaderRow = 2
    debug.weekHeaderRowFallback = true
  }

  // Build week column map
  const weekCols: Record<number, WeekKey> = {}
  for (let col = FIXED_COLS; col <= range.e.c; col++) {
    const cell = getCell(ws, weekHeaderRow, col)
    if (!cell) continue
    const val = String(cell.v ?? '').trim()
    const m   = val.match(/S(\d+)/i)
    if (m) {
      const weekNum = parseInt(m[1])
      const year = weekNum >= 19 ? 2026 : 2027
      weekCols[col] = { week: weekNum, year }
    }
  }
  debug.weekColsFound = Object.keys(weekCols).length

  // Find first data row (row after week header + optional date row)
  const firstDataRow = weekHeaderRow + 2 // skip week row + date row

  const items: ParsedItem[] = []
  let sectionHeader = 0

  for (let row = firstDataRow; row <= range.e.r; row++) {
    const cell0 = getCell(ws, row, 0)
    if (!cell0 || cell0.v === undefined || cell0.v === null || cell0.v === '') continue

    // Accept numeric type OR text that parses as a positive integer
    let assetNum: number | null = null
    if (typeof cell0.v === 'number' && cell0.v > 0) {
      assetNum = cell0.v
    } else {
      const parsed = parseInt(String(cell0.v).trim())
      if (!isNaN(parsed) && parsed > 0) assetNum = parsed
    }

    if (assetNum === null) {
      sectionHeader++
      continue // section header row
    }

    const scheduledWeeks: WeekKey[] = []
    for (const [colStr, wk] of Object.entries(weekCols)) {
      const col  = parseInt(colStr)
      const cell = getCell(ws, row, col)
      if (cell && cell.v !== undefined && cell.v !== null && cell.v !== '') {
        scheduledWeeks.push(wk)
      }
    }

    items.push({
      asset_num:       assetNum,
      categoria:       getString(ws, row, 1),
      codigo:          getString(ws, row, 2),
      equipo:          getString(ws, row, 3),
      area:            getString(ws, row, 4),
      ruta:            getString(ws, row, 5),
      hh:              getNum(ws, row, 6),
      scheduled_weeks: scheduledWeeks,
    })
  }

  debug.sectionHeaders = sectionHeader
  debug.itemsParsed = items.length
  debug.sampleItems = items.slice(0, 3)

  return { items, debug }
}

// ── Parse Routes sheet ────────────────────────────────────────────────────────

interface ParsedRoute {
  ruta_zona:     string
  frec_visual:   string
  jornada_campo: string
  activos_count: number
  hh_semana:     string
  composicion:   string
  sort_order:    number
}

function parseRoutesSheet(ws: XLSX.WorkSheet): ParsedRoute[] {
  const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: '' }) as string[][]
  const routes: ParsedRoute[] = []

  // Find header row: look for row containing 'ruta' OR 'zona'
  let headerRow = -1
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowLower = row.map((c) => String(c).toLowerCase())
    if (rowLower.some((c) => c.includes('ruta') || c.includes('zona'))) {
      headerRow = i; break
    }
  }
  if (headerRow === -1) return routes

  let order = 0
  for (let i = headerRow + 1; i < rows.length; i++) {
    const row = rows[i]
    const rutaZona = String(row[0] ?? '').trim()
    if (!rutaZona) continue

    const activosStr  = String(row[3] ?? '').trim()
    const countMatch  = activosStr.match(/(\d+)\s*activos?/i)
    const hhMatch     = activosStr.match(/~?([\d.,]+)\s*hs/i)
    const activos_count = countMatch ? parseInt(countMatch[1]) : 0
    const hh_semana     = hhMatch ? `${hhMatch[1]} hs/sem` : ''

    routes.push({
      ruta_zona:     rutaZona,
      frec_visual:   String(row[1] ?? '').trim(),
      jornada_campo: String(row[2] ?? '').trim(),
      activos_count,
      hh_semana,
      composicion:   String(row[4] ?? '').trim(),
      sort_order:    order++,
    })
  }

  return routes
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Auth check
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  // Role check
  const { data: userData } = await supabase
    .from('users').select('role').eq('id', user.id).single()
  if (userData?.role !== 'superusuario') {
    return NextResponse.json({ error: 'Sin permisos para importar' }, { status: 403 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No se recibió archivo' }, { status: 400 })

    const buffer = await file.arrayBuffer()
    const wb     = XLSX.read(buffer)

    const sheetNames = wb.SheetNames
    console.log('[InspectionImport] Sheet names:', sheetNames)

    // Find sheets — flexible matching
    const ganttSheetName  = wb.SheetNames.find((n) => n.toLowerCase().includes('gantt'))
    const routesSheetName = wb.SheetNames.find(
      (n) => n.toLowerCase().includes('ruta') || n.toLowerCase().includes('route')
    )

    if (!ganttSheetName) {
      return NextResponse.json({
        error: `No se encontró hoja de Gantt. Hojas disponibles: ${sheetNames.join(', ')}`,
      }, { status: 422 })
    }

    const { items: ganttItems, debug: ganttDebug } = parseGanttSheet(wb.Sheets[ganttSheetName])
    const routes = routesSheetName ? parseRoutesSheet(wb.Sheets[routesSheetName]) : []

    console.log('[InspectionImport] Gantt debug:', JSON.stringify(ganttDebug, null, 2))
    console.log('[InspectionImport] Routes parsed:', routes.length)

    if (ganttItems.length === 0) {
      return NextResponse.json({
        error: 'No se encontraron activos en el Gantt',
        debug: ganttDebug,
      }, { status: 422 })
    }

    const admin = createAdminClient()

    // Mark all existing programs as inactive
    await admin.from('inspection_programs').update({ is_active: false }).eq('is_active', true)

    // Create new program
    const { data: program, error: progErr } = await admin
      .from('inspection_programs')
      .insert({
        filename:     file.name,
        uploaded_by:  user.id,
        is_active:    true,
        total_assets: ganttItems.length,
      })
      .select()
      .single()

    if (progErr || !program) {
      console.error('[InspectionImport] program insert error:', progErr)
      return NextResponse.json({
        error: progErr?.message ?? 'Error al crear programa en base de datos',
      }, { status: 500 })
    }

    // Batch insert gantt items
    const BATCH = 500
    let insertedItems = 0
    for (let i = 0; i < ganttItems.length; i += BATCH) {
      const batch = ganttItems.slice(i, i + BATCH).map((item) => ({
        ...item,
        program_id: program.id,
      }))
      const { error, count } = await admin.from('inspection_gantt_items').insert(batch).select('id')
      if (error) {
        console.error('[InspectionImport] items batch error:', error)
      } else {
        insertedItems += batch.length
      }
    }

    // Insert routes
    let insertedRoutes = 0
    if (routes.length > 0) {
      const { error } = await admin.from('inspection_routes').insert(
        routes.map((r) => ({ ...r, program_id: program.id }))
      )
      if (error) {
        console.error('[InspectionImport] routes error:', error)
      } else {
        insertedRoutes = routes.length
      }
    }

    return NextResponse.json({
      program,
      items_count:  insertedItems,
      routes_count: insertedRoutes,
    })
  } catch (err) {
    console.error('[InspectionImport] error', err)
    return NextResponse.json({
      error: `Error procesando el archivo: ${err instanceof Error ? err.message : String(err)}`,
    }, { status: 500 })
  }
}

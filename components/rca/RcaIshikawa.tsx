'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import type { CatData, InspData, ProbData, W2HData, CanvasImage } from './types'
import { CATS, QUESTIONS } from './constants'

// ─── Canvas constants ─────────────────────────────────────────────────────────
const CW = 1200, CH = 500
const AH = 260
const BX = [-175, 0, 175] as const
const DIAG = 120, STR = 115
const SPOKES = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3] as const
const PW = 88, PH = 70, PHL = 20
const TH = 22, TG = 4
const PAN = 12

// ─── KIRA dark palette (used in canvas drawing) ───────────────────────────────
const K = {
  pageBg:    '#020617',  // slate-950 — canvas fill
  cardBg:    '#0f172a',  // slate-900 — modal bg
  surfaceBg: '#1e293b',  // slate-800 — board bg, input bg
  border:    '#334155',  // slate-700
  accent:    '#0ea5e9',  // sky-500   — axis, active elements
  textPri:   '#f1f5f9',  // slate-100
  textSec:   '#94a3b8',  // slate-400
  textMut:   '#64748b',  // slate-500
  shadow:    'rgba(0,0,0,0.5)',
}

interface HitBoard { idx: number; x0: number; x1: number; y0: number; y1: number }
interface HitAxis  { key: string; x0: number; x1: number; y0: number; y1: number }

interface RenderState {
  angleX: number; angleZ: number; anglePitch: number
  zoom: number; velX: number
  panX: number; panY: number; tPX: number; tPY: number; easing: boolean
  dragBtn: number | null; dlx: number; dly: number; dragMX: number; dragT: number
  keys: Record<string, boolean>
  hitBoards: HitBoard[]
  hitAxis:   HitAxis[]
}

interface Props {
  catData:     CatData[]
  setCatData:  React.Dispatch<React.SetStateAction<CatData[]>>
  inspData:    InspData
  setInspData: React.Dispatch<React.SetStateAction<InspData>>
  probData:    ProbData
  setProbData: React.Dispatch<React.SetStateAction<ProbData>>
  onBack:      () => void
  onNext:      () => void
}

export default function RcaIshikawa({
  catData, setCatData,
  inspData, setInspData,
  probData, setProbData,
  onBack, onNext,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const centerFn  = useRef<() => void>(() => {})

  const rs = useRef<RenderState>({
    angleX: 0, angleZ: 0.3, anglePitch: 0,
    zoom: 0.85, velX: 0,
    panX: 0, panY: 0, tPX: 0, tPY: 0, easing: false,
    dragBtn: null, dlx: 0, dly: 0, dragMX: 0, dragT: 0,
    keys: {}, hitBoards: [], hitAxis: [],
  })

  // Refs for latest data (avoids stale closures in animation loop)
  const catRef  = useRef(catData)
  const inspRef = useRef(inspData)
  const probRef = useRef(probData)
  useEffect(() => { catRef.current  = catData  }, [catData])
  useEffect(() => { inspRef.current = inspData }, [inspData])
  useEffect(() => { probRef.current = probData }, [probData])

  // ── Modal state ──────────────────────────────────────────────────────────────
  const [activeCatIdx, setActiveCatIdx] = useState<number | null>(null)
  const [probOpen,     setProbOpen]     = useState(false)
  const [inspOpen,     setInspOpen]     = useState(false)

  const [catObs,    setCatObs]    = useState('')
  const [catCauses, setCatCauses] = useState<string[]>([])
  const [catImages, setCatImages] = useState<CanvasImage[]>([])
  const [causeInp,  setCauseInp]  = useState('')

  const [inspText,   setInspText]   = useState('')
  const [inspImages, setInspImages] = useState<CanvasImage[]>([])

  const [probW2H,    setProbW2H]   = useState<Partial<W2HData>>({})
  const [probImages, setProbImages] = useState<CanvasImage[]>([])

  // ── Canvas loop ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!canvasRef.current) return
    const canvas: HTMLCanvasElement = canvasRef.current
    const ctx = canvas.getContext('2d')!
    let rafId = 0

    function p3(wx: number, wy: number, wz: number) {
      const { angleX: ax, angleZ: az, anglePitch: ap, zoom, panX, panY } = rs.current
      const y1 = wy * Math.cos(ax) - wz * Math.sin(ax)
      const z1 = wy * Math.sin(ax) + wz * Math.cos(ax)
      const x2 = wx * Math.cos(az) - y1 * Math.sin(az)
      const y2 = wx * Math.sin(az) + y1 * Math.cos(az)
      const x3 = x2 * Math.cos(ap) + z1 * Math.sin(ap)
      const z3 = -x2 * Math.sin(ap) + z1 * Math.cos(ap)
      return {
        x: CW / 2 + panX + (x3 * 0.82 + y2 * -0.50) * zoom,
        y: CH / 2 + panY + (x3 * 0.26 + y2 * 0.22 + z3 * -0.95) * zoom,
      }
    }

    function spine(cat: (typeof CATS)[number]) {
      const bx = BX[cat.b], a = SPOKES[cat.sk] + rs.current.angleX, d = DIAG * 0.707
      return {
        root: { x: bx,          y: 0,               z: 0               },
        knee: { x: bx + d,      y: Math.cos(a) * d, z: Math.sin(a) * d },
        tip:  { x: bx + d + STR, y: Math.cos(a) * d, z: Math.sin(a) * d },
      }
    }

    function trunc(t: string, mw: number) {
      let s = t
      while (ctx.measureText(s).width > mw && s.length > 2) s = s.slice(0, -1)
      return s
    }

    function drawThumbs(sx: number, sy: number, images: CanvasImage[]) {
      if (!images.length) return
      const ox = sx + PW / 2 + 5
      images.slice(0, 4).forEach((img, i) => {
        const ty = sy + i * (TH + TG)
        ctx.save()
        ctx.beginPath(); ctx.roundRect(ox, ty, TH, TH, 3); ctx.clip()
        ctx.drawImage(img.el, ox, ty, TH, TH)
        ctx.restore()
        ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 1.5
        ctx.beginPath(); ctx.roundRect(ox, ty, TH, TH, 3); ctx.stroke()
      })
      if (images.length > 4) {
        ctx.fillStyle = 'rgba(0,0,0,.7)'
        ctx.beginPath(); ctx.roundRect(ox, sy + 4 * (TH + TG), TH, TH, 3); ctx.fill()
        ctx.fillStyle = '#fff'; ctx.font = 'bold 8px sans-serif'
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText(`+${images.length - 4}`, ox + TH / 2, sy + 4 * (TH + TG) + TH / 2)
      }
    }

    function drawBoard(sx: number, sy: number, cat: (typeof CATS)[number], idx: number) {
      const x = sx - PW / 2, y = sy
      const col = cat.c
      const d = catRef.current[idx]

      // Shadow
      ctx.fillStyle = K.shadow
      ctx.beginPath(); ctx.roundRect(x + 2, y + 2, PW, PH, 6); ctx.fill()

      // Board background (dark surface)
      ctx.fillStyle = K.surfaceBg
      ctx.beginPath(); ctx.roundRect(x, y, PW, PH, 6); ctx.fill()
      ctx.strokeStyle = col; ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.roundRect(x, y, PW, PH, 6); ctx.stroke()

      // Colored header strip
      ctx.fillStyle = col
      ctx.beginPath()
      ctx.roundRect(x, y, PW, PHL, { upperLeft: 6, upperRight: 6, lowerLeft: 0, lowerRight: 0 } as unknown as number)
      ctx.fill()

      // Spine connector dot
      ctx.fillStyle = K.pageBg
      ctx.beginPath(); ctx.arc(sx, sy, 3, 0, Math.PI * 2); ctx.fill()

      // Short label in header
      ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillStyle = '#fff'
      ctx.fillText(cat.s, sx, y + PHL / 2)

      if (d.text || d.causes.length) {
        ctx.font = '9px sans-serif'; ctx.fillStyle = K.textSec
        ctx.textAlign = 'left'; ctx.textBaseline = 'top'
        let row = 0
        if (d.text) {
          ctx.fillText(trunc(d.text.split('\n')[0], PW - 8), x + 4, y + PHL + 3 + row * 10)
          row++
        }
        if (d.causes.length) {
          ctx.fillStyle = col; ctx.font = 'bold 8px sans-serif'
          ctx.fillText(`● ${d.causes.length} causa${d.causes.length > 1 ? 's' : ''}`, x + 4, y + PHL + 3 + row * 10)
        }
      } else {
        ctx.font = '8px sans-serif'; ctx.fillStyle = K.textMut
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText('dbl-click', sx, y + PHL + (PH - PHL) / 2)
      }

      if (d.images.length) {
        ctx.font = '10px sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom'
        ctx.fillStyle = K.textSec
        ctx.fillText('📎', x + PW - 3, y + PH - 2)
        drawThumbs(sx, sy, d.images)
      }

      rs.current.hitBoards.push({ idx, x0: x, x1: x + PW, y0: y, y1: y + PH })
    }

    function probSummary() {
      const w = probRef.current.w2h
      return [w.what, w.where ? '📍 ' + w.where : '', w.when ? '🕐 ' + w.when : '']
        .filter(Boolean).join('\n')
    }

    function drawAxisBox(
      sx: number, sy: number,
      label: string, col: string,
      summary: string, hasImgs: boolean, key: string,
    ) {
      const bw = 118, bh = 58, x = sx - bw / 2, y = sy - bh / 2
      ctx.fillStyle = K.shadow
      ctx.beginPath(); ctx.roundRect(x + 2, y + 2, bw, bh, 8); ctx.fill()
      ctx.fillStyle = col
      ctx.beginPath(); ctx.roundRect(x, y, bw, bh, 8); ctx.fill()
      ctx.fillStyle = '#fff'; ctx.font = 'bold 10px sans-serif'
      ctx.textAlign = 'center'; ctx.textBaseline = 'top'
      ctx.fillText(label, sx, y + 6)
      if (summary) {
        ctx.font = '8px sans-serif'; ctx.fillStyle = 'rgba(255,255,255,.85)'
        summary.split('\n').slice(0, 3).forEach((l, i) =>
          ctx.fillText(trunc(l, bw - 14), sx, y + 18 + i * 11))
      } else {
        ctx.font = '8px sans-serif'; ctx.fillStyle = 'rgba(255,255,255,.4)'
        ctx.textBaseline = 'middle'; ctx.fillText('dbl-click', sx, y + bh * 0.68)
      }
      if (hasImgs) {
        ctx.font = '10px sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom'
        ctx.fillStyle = 'rgba(255,255,255,.7)'
        ctx.fillText('📎', x + bw - 4, y + bh - 3)
      }
      rs.current.hitAxis.push({ key, x0: x, x1: x + bw, y0: y, y1: y + bh })
    }

    function draw() {
      ctx.clearRect(0, 0, CW, CH)
      // Dark canvas background
      ctx.fillStyle = K.pageBg
      ctx.fillRect(0, 0, CW, CH)

      rs.current.hitBoards = []
      rs.current.hitAxis   = []

      const { zoom } = rs.current
      const aL = p3(-AH, 0, 0), aR = p3(AH, 0, 0)

      // Main axis
      ctx.beginPath(); ctx.moveTo(aL.x, aL.y); ctx.lineTo(aR.x, aR.y)
      ctx.strokeStyle = K.accent; ctx.lineWidth = Math.max(1, 3 * zoom); ctx.stroke()

      // Axis junctions
      BX.forEach(bx => {
        const pt = p3(bx, 0, 0)
        ctx.beginPath(); ctx.arc(pt.x, pt.y, Math.max(2, 5 * zoom), 0, Math.PI * 2)
        ctx.fillStyle = K.accent; ctx.fill()
      })

      // Spines — sort back-to-front
      const spines = CATS.map((cat, i) => {
        const s = spine(cat)
        const m = p3((s.root.x + s.tip.x) / 2, (s.root.y + s.tip.y) / 2, (s.root.z + s.tip.z) / 2)
        return { cat, i, s, dy: m.y }
      }).sort((a, b) => a.dy - b.dy)

      for (const { cat, s } of spines) {
        const pR = p3(s.root.x, s.root.y, s.root.z)
        const pK = p3(s.knee.x, s.knee.y, s.knee.z)
        const pT = p3(s.tip.x,  s.tip.y,  s.tip.z)
        ctx.strokeStyle = cat.c; ctx.lineWidth = Math.max(1, 2 * zoom)
        ctx.beginPath(); ctx.moveTo(pR.x, pR.y); ctx.lineTo(pK.x, pK.y); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(pK.x, pK.y); ctx.lineTo(pT.x, pT.y); ctx.stroke()
      }

      // Axis on top
      ctx.beginPath(); ctx.moveTo(aL.x, aL.y); ctx.lineTo(aR.x, aR.y)
      ctx.strokeStyle = K.accent; ctx.lineWidth = Math.max(1, 3 * zoom); ctx.stroke()

      // Boards
      for (const { cat, i, s } of spines) {
        const tp = p3(s.tip.x, s.tip.y, s.tip.z)
        drawBoard(tp.x, tp.y, cat, i)
      }

      // Axis endpoint boxes
      const iP = p3(-AH - 38, 0, 0), pP = p3(AH + 38, 0, 0)
      drawAxisBox(iP.x, iP.y, 'Insight Inspector', '#b45309',
        inspRef.current.text, inspRef.current.images.length > 0, 'inspector')
      drawAxisBox(pP.x, pP.y, 'Problema', '#991b1b',
        probSummary(), probRef.current.images.length > 0, 'problema')
    }

    function center() {
      const pts = [p3(-AH - 80, 0, 0), p3(AH + 80, 0, 0)]
      CATS.forEach(cat => {
        const s = spine(cat), tp = p3(s.tip.x, s.tip.y, s.tip.z)
        pts.push({ x: tp.x - PW / 2, y: tp.y }, { x: tp.x + PW / 2, y: tp.y + PH })
      })
      const xs = pts.map(p => p.x), ys = pts.map(p => p.y)
      rs.current.tPX = rs.current.panX + (CW / 2 - (Math.max(...xs) + Math.min(...xs)) / 2)
      rs.current.tPY = rs.current.panY + (CH / 2 - (Math.max(...ys) + Math.min(...ys)) / 2)
      rs.current.easing = true
    }
    centerFn.current = center

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t

    function loop() {
      const s = rs.current
      if (s.keys['ArrowLeft'])  s.panX += PAN
      if (s.keys['ArrowRight']) s.panX -= PAN
      if (s.keys['ArrowUp'])    s.panY += PAN
      if (s.keys['ArrowDown'])  s.panY -= PAN
      if (s.easing) {
        s.panX = lerp(s.panX, s.tPX, 0.12); s.panY = lerp(s.panY, s.tPY, 0.12)
        if (Math.abs(s.panX - s.tPX) < 0.3 && Math.abs(s.panY - s.tPY) < 0.3) {
          s.panX = s.tPX; s.panY = s.tPY; s.easing = false
        }
      }
      if (!s.dragBtn && !s.easing) {
        s.velX *= 0.965; s.angleX += s.velX
        if (Math.abs(s.velX) < 0.0002) s.velX = 0
      }
      draw()
      rafId = requestAnimationFrame(loop)
    }

    // ── Event handlers ──────────────────────────────────────────────────────────
    function onKeyDown(e: KeyboardEvent) {
      const arrows = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']
      if (arrows.includes(e.key)) { e.preventDefault(); rs.current.keys[e.key] = true; rs.current.easing = false }
    }
    function onKeyUp(e: KeyboardEvent) { rs.current.keys[e.key] = false }

    function onPointerDown(e: PointerEvent) {
      e.preventDefault(); canvas.focus()
      if (rs.current.dragBtn !== null) return
      rs.current.dragBtn = e.button
      rs.current.dlx = e.offsetX; rs.current.dly = e.offsetY
      rs.current.dragMX = e.offsetX; rs.current.dragT = performance.now()
      if (e.button === 0) rs.current.velX = 0
      rs.current.easing = false
      canvas.setPointerCapture(e.pointerId)
    }
    function onPointerMove(e: PointerEvent) {
      const s = rs.current
      if (s.dragBtn === null) return
      const dx = e.offsetX - s.dlx, dy = e.offsetY - s.dly
      if (s.dragBtn === 0) {
        s.angleX += dx * 0.007
        const now = performance.now()
        s.velX = (e.offsetX - s.dragMX) * 0.007 / Math.max(1, (now - s.dragT) / 16)
        s.dragMX = e.offsetX; s.dragT = now
        canvas.style.cursor = 'grabbing'
      }
      if (s.dragBtn === 1) { s.angleZ     += dx * 0.007; canvas.style.cursor = 'ew-resize' }
      if (s.dragBtn === 2) { s.anglePitch += dy * 0.006; canvas.style.cursor = 'ns-resize' }
      s.dlx = e.offsetX; s.dly = e.offsetY
    }
    function onPointerUp()     { rs.current.dragBtn = null; canvas.style.cursor = 'grab' }
    function onPointerCancel() { rs.current.dragBtn = null; canvas.style.cursor = 'grab' }
    function onContextMenu(e: Event) { e.preventDefault() }
    function onWheel(e: WheelEvent) {
      e.preventDefault()
      rs.current.zoom = Math.max(0.05, rs.current.zoom * (e.deltaY > 0 ? 0.92 : 1.08))
    }
    function onDblClick(e: MouseEvent) {
      const mx = e.offsetX, my = e.offsetY
      for (const h of rs.current.hitAxis) {
        if (mx >= h.x0 && mx <= h.x1 && my >= h.y0 && my <= h.y1) {
          if (h.key === 'inspector') {
            setInspText(inspRef.current.text); setInspImages([...inspRef.current.images]); setInspOpen(true)
          } else {
            setProbW2H({ ...probRef.current.w2h }); setProbImages([...probRef.current.images]); setProbOpen(true)
          }
          return
        }
      }
      for (const h of rs.current.hitBoards) {
        if (mx >= h.x0 && mx <= h.x1 && my >= h.y0 && my <= h.y1) {
          const d = catRef.current[h.idx]
          setCatObs(d.text); setCatCauses([...d.causes]); setCatImages([...d.images]); setCauseInp('')
          setActiveCatIdx(h.idx)
          return
        }
      }
    }

    let lp: number | null = null
    function onTouchStart(e: TouchEvent) {
      if (e.touches.length === 2)
        lp = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY)
    }
    function onTouchMove(e: TouchEvent) {
      if (e.touches.length === 2) {
        const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY)
        if (lp) rs.current.zoom = Math.max(0.05, rs.current.zoom * (d / lp))
        lp = d; e.preventDefault()
      }
    }
    function onTouchEnd() { lp = null }

    canvas.addEventListener('keydown',       onKeyDown)
    canvas.addEventListener('keyup',         onKeyUp)
    canvas.addEventListener('pointerdown',   onPointerDown)
    canvas.addEventListener('pointermove',   onPointerMove)
    canvas.addEventListener('pointerup',     onPointerUp)
    canvas.addEventListener('pointercancel', onPointerCancel)
    canvas.addEventListener('contextmenu',   onContextMenu)
    canvas.addEventListener('wheel',         onWheel, { passive: false })
    canvas.addEventListener('dblclick',      onDblClick)
    canvas.addEventListener('touchstart',    onTouchStart)
    canvas.addEventListener('touchmove',     onTouchMove, { passive: false })
    canvas.addEventListener('touchend',      onTouchEnd)

    rafId = requestAnimationFrame(loop)
    setTimeout(center, 100)

    return () => {
      cancelAnimationFrame(rafId)
      canvas.removeEventListener('keydown',       onKeyDown)
      canvas.removeEventListener('keyup',         onKeyUp)
      canvas.removeEventListener('pointerdown',   onPointerDown)
      canvas.removeEventListener('pointermove',   onPointerMove)
      canvas.removeEventListener('pointerup',     onPointerUp)
      canvas.removeEventListener('pointercancel', onPointerCancel)
      canvas.removeEventListener('contextmenu',   onContextMenu)
      canvas.removeEventListener('wheel',         onWheel)
      canvas.removeEventListener('dblclick',      onDblClick)
      canvas.removeEventListener('touchstart',    onTouchStart)
      canvas.removeEventListener('touchmove',     onTouchMove)
      canvas.removeEventListener('touchend',      onTouchEnd)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Modal close / save handlers ───────────────────────────────────────────
  const closeCat = useCallback(() => {
    if (activeCatIdx !== null) {
      setCatData(prev => {
        const next = [...prev]
        next[activeCatIdx] = { text: catObs, causes: catCauses, images: catImages }
        return next
      })
    }
    setActiveCatIdx(null)
    canvasRef.current?.focus()
  }, [activeCatIdx, catObs, catCauses, catImages, setCatData])

  const closeInsp = useCallback(() => {
    setInspData({ text: inspText, images: inspImages })
    setInspOpen(false)
    canvasRef.current?.focus()
  }, [inspText, inspImages, setInspData])

  const closeProb = useCallback(() => {
    setProbData(pd => ({ ...pd, w2h: probW2H, images: probImages }))
    setProbOpen(false)
    canvasRef.current?.focus()
  }, [probW2H, probImages, setProbData])

  const addCause = useCallback(() => {
    const v = causeInp.trim()
    if (v) { setCatCauses(c => [...c, v]); setCauseInp('') }
  }, [causeInp])

  function handleCatFiles(e: React.ChangeEvent<HTMLInputElement>) {
    Array.from(e.target.files ?? []).forEach(f => {
      const src = URL.createObjectURL(f)
      const el = new Image(); el.src = src
      el.onload = () => setCatImages(imgs => [...imgs, { src, el }])
    }); e.target.value = ''
  }
  function handleInspFiles(e: React.ChangeEvent<HTMLInputElement>) {
    Array.from(e.target.files ?? []).forEach(f => {
      const src = URL.createObjectURL(f)
      const el = new Image(); el.src = src
      el.onload = () => setInspImages(imgs => [...imgs, { src, el }])
    }); e.target.value = ''
  }
  function handleProbFiles(e: React.ChangeEvent<HTMLInputElement>) {
    Array.from(e.target.files ?? []).forEach(f => {
      const src = URL.createObjectURL(f)
      const el = new Image(); el.src = src
      el.onload = () => setProbImages(imgs => [...imgs, { src, el }])
    }); e.target.value = ''
  }

  const activeCat = activeCatIdx !== null ? CATS[activeCatIdx] : null

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: K.pageBg, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '10px 0' }}>
      {/* Controls hint */}
      <div style={{ fontSize: 11, color: K.textMut, display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
        <span>🖱️ <b>Izq</b> rotar</span>
        <span>⚙️ <b>Rueda</b> zoom</span>
        <span>🖱️ <b>Centro</b> rotar Z</span>
        <span>🖱️ <b>Der</b> pitch</span>
        <span>⌨️ <b>Flechas</b> mover</span>
        <span>🖱️ <b>Dbl-click</b> editar</span>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button onClick={() => centerFn.current()} style={btnSm}>⌖ Centrar</button>
        <button onClick={onBack}  style={btnSm}>← 5W2H</button>
        <button onClick={onNext}  style={btnPrimary}>Analizar con IA →</button>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={CW} height={CH}
        tabIndex={0}
        style={{ borderRadius: 10, display: 'block', outline: 'none', cursor: 'grab', maxWidth: '100%', border: `1px solid ${K.border}` }}
      />

      <div style={{ fontSize: 11, color: K.textMut }}>
        Hacé doble click en una categoría para editarla
      </div>

      {/* ── Category Modal ──────────────────────────────────────────────────── */}
      {activeCatIdx !== null && activeCat && (
        <Overlay>
          <ModalBox>
            <div style={{ ...mboxHeader, background: activeCat.c + '22', borderBottom: `1px solid ${activeCat.c}44` }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: activeCat.c, flexShrink: 0 }} />
              <h3 style={{ ...mboxTitle, color: activeCat.c }}>{activeCat.l}</h3>
              <button style={{ ...xbtn, background: 'transparent', border: `1px solid ${K.border}`, color: K.textSec }} onClick={closeCat}>✕</button>
            </div>
            <div style={mb}>
              {/* Guiding questions */}
              <div style={{ background: K.pageBg, borderRadius: 7, padding: '10px 13px', border: `1px solid ${K.border}` }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: K.textMut, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 5 }}>
                  Preguntas guía
                </p>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {(QUESTIONS[activeCatIdx] ?? []).map((q, i) => (
                    <li key={i} style={{ fontSize: 11, color: K.textSec, paddingLeft: 12, position: 'relative', lineHeight: 1.4 }}>
                      <span style={{ position: 'absolute', left: 0, color: K.textMut, fontWeight: 700, fontSize: 9 }}>?</span>
                      {q}
                    </li>
                  ))}
                </ul>
              </div>

              <span style={slabel}>📝 Observaciones</span>
              <textarea value={catObs} onChange={e => setCatObs(e.target.value)}
                placeholder="Describí lo que observás en esta rama..." style={mta} />

              <span style={slabel}>🔴 Causas identificadas</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {catCauses.map((c, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, background: K.pageBg, borderRadius: 6, padding: '5px 9px', border: `1px solid ${K.border}` }}>
                    <span style={{ flex: 1, fontSize: 12, color: K.textPri }}>● {c}</span>
                    <button onClick={() => setCatCauses(cs => cs.filter((_, j) => j !== i))}
                      style={{ background: 'none', border: 'none', color: K.textMut, cursor: 'pointer', fontSize: 12 }}>✕</button>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input type="text" value={causeInp} onChange={e => setCauseInp(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addCause()}
                  placeholder="Agregar causa..." style={inputSm} />
                <button onClick={addCause}
                  style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: K.accent, color: '#fff', cursor: 'pointer', fontSize: 12 }}>
                  + Agregar
                </button>
              </div>

              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: K.textSec, marginBottom: 6 }}>📎 Imágenes</p>
                <ImgGrid images={catImages} onRemove={i => setCatImages(imgs => imgs.filter((_, j) => j !== i))} />
                <label style={ubtn}>📷 Adjuntar<input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleCatFiles} /></label>
              </div>
            </div>
            <div style={mf}>
              <button onClick={closeCat} style={btnPrimary}>Guardar y cerrar</button>
            </div>
          </ModalBox>
        </Overlay>
      )}

      {/* ── Inspector Modal ─────────────────────────────────────────────────── */}
      {inspOpen && (
        <Overlay>
          <ModalBox>
            <div style={{ ...mboxHeader, background: 'rgba(180,83,9,0.15)', borderBottom: '1px solid rgba(180,83,9,0.3)' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b', flexShrink: 0 }} />
              <h3 style={{ ...mboxTitle, color: '#fbbf24' }}>Insight Inspector</h3>
              <button style={{ ...xbtn, background: 'transparent', border: `1px solid ${K.border}`, color: K.textSec }} onClick={closeInsp}>✕</button>
            </div>
            <div style={mb}>
              <span style={slabel}>📝 Observaciones del inspector</span>
              <textarea value={inspText} onChange={e => setInspText(e.target.value)}
                placeholder="Observaciones, hipótesis o insights..." style={{ ...mta, minHeight: 120 }} />
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: K.textSec, marginBottom: 6 }}>📎 Imágenes</p>
                <ImgGrid images={inspImages} onRemove={i => setInspImages(imgs => imgs.filter((_, j) => j !== i))} />
                <label style={ubtn}>📷 Adjuntar<input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleInspFiles} /></label>
              </div>
            </div>
            <div style={mf}>
              <button onClick={closeInsp} style={btnPrimary}>Guardar y cerrar</button>
            </div>
          </ModalBox>
        </Overlay>
      )}

      {/* ── Problem Modal ───────────────────────────────────────────────────── */}
      {probOpen && (
        <Overlay>
          <ModalBox>
            <div style={{ ...mboxHeader, background: 'rgba(153,27,27,0.2)', borderBottom: '1px solid rgba(153,27,27,0.35)' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f87171', flexShrink: 0 }} />
              <h3 style={{ ...mboxTitle, color: '#fca5a5' }}>Problema — 5W2H</h3>
              <button style={{ ...xbtn, background: 'transparent', border: `1px solid ${K.border}`, color: K.textSec }} onClick={closeProb}>✕</button>
            </div>
            <div style={mb}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {(
                  [
                    ['what',    '¿Qué ocurrió?',      true ],
                    ['who',     '¿Quién?',             false],
                    ['where',   '¿Dónde?',             false],
                    ['when',    '¿Cuándo?',            false],
                    ['why',     '¿Por qué? (inicial)', false],
                    ['how',     '¿Cómo?',              false],
                    ['howmuch', '¿Cuánto impacto?',    false],
                  ] as [keyof W2HData, string, boolean][]
                ).map(([k, label, full]) => (
                  <div key={k} style={full ? { gridColumn: '1/-1' } : {}}>
                    <label style={{ fontSize: 10, fontWeight: 700, color: K.textMut, textTransform: 'uppercase', letterSpacing: '.04em', display: 'block', marginBottom: 3 }}>
                      {label}
                    </label>
                    <textarea rows={2}
                      value={(probW2H as Record<string, string>)[k] ?? ''}
                      onChange={e => setProbW2H(w => ({ ...w, [k]: e.target.value }))}
                      style={{ width: '100%', minHeight: 50, fontFamily: 'inherit', fontSize: 12, background: K.pageBg, border: `1px solid ${K.border}`, borderRadius: 6, padding: 6, resize: 'vertical', color: K.textPri }} />
                  </div>
                ))}
              </div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: K.textSec, marginBottom: 6 }}>📎 Imágenes</p>
                <ImgGrid images={probImages} onRemove={i => setProbImages(imgs => imgs.filter((_, j) => j !== i))} />
                <label style={ubtn}>📷 Adjuntar<input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleProbFiles} /></label>
              </div>
            </div>
            <div style={mf}>
              <button onClick={closeProb} style={btnPrimary}>Guardar y cerrar</button>
            </div>
          </ModalBox>
        </Overlay>
      )}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      background: 'rgba(0,0,0,.75)', zIndex: 50,
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      paddingTop: 20, overflowY: 'auto',
    }}>
      {children}
    </div>
  )
}

function ModalBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: '#0f172a',
      border: '1px solid #334155',
      borderRadius: 12, width: 540,
      boxShadow: '0 20px 60px rgba(0,0,0,.6)',
      marginBottom: 30, overflow: 'hidden',
    }}>
      {children}
    </div>
  )
}

function ImgGrid({ images, onRemove }: { images: CanvasImage[]; onRemove: (i: number) => void }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 7 }}>
      {images.map((img, i) => (
        <div key={i} style={{ position: 'relative', width: 66, height: 66 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img.src} alt="evidencia" style={{ width: 66, height: 66, borderRadius: 6, objectFit: 'cover', border: '2px solid #334155' }} />
          <button onClick={() => onRemove(i)}
            style={{ position: 'absolute', top: -5, right: -5, background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: 16, height: 16, cursor: 'pointer', fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}

// ─── Inline styles ────────────────────────────────────────────────────────────

const btnSm: React.CSSProperties = {
  fontSize: 12, padding: '5px 14px', borderRadius: 6,
  border: '1px solid #334155', background: '#1e293b',
  cursor: 'pointer', color: '#94a3b8',
}
const btnPrimary: React.CSSProperties = {
  fontSize: 13, padding: '8px 20px', borderRadius: 8, border: 'none',
  cursor: 'pointer', fontWeight: 600, background: '#0ea5e9', color: '#fff',
}
const mboxHeader: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 10, padding: '13px 18px',
}
const mboxTitle: React.CSSProperties = { fontSize: 14, fontWeight: 700, flex: 1, margin: 0 }
const xbtn: React.CSSProperties = {
  border: 'none', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontSize: 12,
}
const mb: React.CSSProperties = {
  padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 11,
}
const slabel: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: '#94a3b8' }
const mta: React.CSSProperties = {
  width: '100%', minHeight: 75, fontFamily: 'inherit', fontSize: 13,
  background: '#020617', border: '1px solid #334155',
  borderRadius: 7, padding: 8, resize: 'vertical', color: '#f1f5f9',
  outline: 'none',
}
const inputSm: React.CSSProperties = {
  flex: 1, padding: '6px 9px',
  background: '#020617', border: '1px solid #334155',
  borderRadius: 6, fontSize: 12, fontFamily: 'inherit', color: '#f1f5f9',
}
const mf: React.CSSProperties = {
  display: 'flex', justifyContent: 'flex-end',
  padding: '11px 18px', borderTop: '1px solid #1e293b',
}
const ubtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 5,
  padding: '6px 12px', border: '1px dashed #334155', borderRadius: 7,
  fontSize: 11, color: '#64748b', cursor: 'pointer', background: '#020617',
}

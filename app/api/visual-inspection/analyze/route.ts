import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// ─── System prompt ────────────────────────────────────────────────────────────

const VISUAL_SYSTEM_PROMPT = `Sos KIRA, experto en inspección visual industrial para operaciones mineras en Patagonia, Argentina.

Analizás imágenes de equipos industriales (termográficas IR, visuales de campo, fotos de daños, etc.) y generás diagnósticos técnicos estructurados.

Devolvé SIEMPRE y ÚNICAMENTE un JSON válido con esta estructura exacta, sin texto adicional antes ni después:
{
  "diagnostico": "descripción técnica detallada de lo observado en la imagen",
  "severidad": "ALTA" | "MEDIA" | "BAJA",
  "base_metodologica": "normas y metodologías aplicadas al diagnóstico",
  "recomendaciones": "acciones de campo concretas y priorizadas"
}

Criterios de severidad:
- ALTA: Riesgo inmediato de falla o accidente — acción correctiva < 24hs, posible fuera de servicio
- MEDIA: Deterioro progresivo observable — programar intervención en < 2 semanas
- BAJA: Condición a monitorear — incluir en próxima inspección rutinaria

Normas de referencia según contexto: ISO 10816, ISO 13373, ASME B30, API 653, NFPA 70B, ISO 45001.
Respondé en español argentino técnico. Sé específico con temperaturas, zonas afectadas y mecanismos de falla cuando sean visibles.`

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Auth
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { data: userData } = await supabase
    .from('users')
    .select('id, name')
    .eq('id', user.id)
    .single()

  // Parse form data
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Error al procesar el formulario' }, { status: 400 })
  }

  const imageFile = formData.get('image') as File | null
  const tag = (formData.get('tag') as string | null)?.trim()
  const observation = (formData.get('observation') as string | null)?.trim() ?? ''

  if (!imageFile || !tag) {
    return NextResponse.json({ error: 'Imagen y TAG del activo son requeridos' }, { status: 400 })
  }

  // File validation
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  if (!validTypes.includes(imageFile.type)) {
    return NextResponse.json({ error: 'Formato de imagen no soportado. Usá JPEG, PNG o WebP.' }, { status: 400 })
  }

  // Convert to buffer once (reused for storage + Claude)
  const bytes = await imageFile.arrayBuffer()
  const buffer = Buffer.from(bytes)
  const base64 = buffer.toString('base64')
  const mediaType = imageFile.type as 'image/jpeg' | 'image/png' | 'image/webp'

  // ── No API key → placeholder response ─────────────────────────────────────
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({
      tag,
      diagnostico:
        '⚠️ KIRA no está conectada — La API key de Claude no está configurada.\n\nAgregá ANTHROPIC_API_KEY en el archivo .env.local para habilitar el análisis por visión artificial.',
      severidad: 'MEDIA',
      base_metodologica: 'Pendiente de configuración de API.',
      recomendaciones: 'Configurá la API key de Claude para habilitar el diagnóstico automático.',
      foto_url: null,
      fecha: new Date().toISOString(),
      inspector_name: userData?.name ?? 'Inspector',
      id: null,
    })
  }

  // ── Upload imagen a Supabase Storage ──────────────────────────────────────
  const admin = createAdminClient()
  const ext = imageFile.type.split('/')[1].replace('jpeg', 'jpg')
  const storagePath = `${user.id}/${Date.now()}-${tag.replace(/[^a-zA-Z0-9-_]/g, '_')}.${ext}`

  let fotoUrl: string | null = null
  try {
    const { data: uploadData, error: uploadError } = await admin.storage
      .from('visual-analyses')
      .upload(storagePath, buffer, { contentType: imageFile.type, upsert: false })

    if (!uploadError && uploadData) {
      const { data: urlData } = admin.storage
        .from('visual-analyses')
        .getPublicUrl(uploadData.path)
      fotoUrl = urlData.publicUrl
    }
  } catch (e) {
    console.warn('[Visual Inspection] Storage upload failed (non-fatal):', e)
  }

  // ── Llamada a Claude Vision ────────────────────────────────────────────────
  let analysis: {
    diagnostico: string
    severidad: string
    base_metodologica: string
    recomendaciones: string
  }

  try {
    const client = new Anthropic({ apiKey })

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 2048,
      system: VISUAL_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64 },
            },
            {
              type: 'text',
              text: `TAG del activo: ${tag}\nObservación del inspector: ${observation || 'Sin observación adicional'}`,
            },
          ],
        },
      ],
    })

    const rawText =
      response.content[0].type === 'text' ? response.content[0].text : ''

    // Parse JSON from Claude response
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      analysis = JSON.parse(jsonMatch[0])
    } else {
      analysis = {
        diagnostico: rawText,
        severidad: 'MEDIA',
        base_metodologica: 'Ver diagnóstico completo arriba.',
        recomendaciones: 'Revisar diagnóstico y determinar acción.',
      }
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[Visual Inspection] Claude error:', msg)
    return NextResponse.json(
      { error: `Error Claude: ${msg}` },
      { status: 500 }
    )
  }

  // Normalize severity
  const validSeverities = ['ALTA', 'MEDIA', 'BAJA']
  if (!validSeverities.includes(analysis.severidad?.toUpperCase())) {
    analysis.severidad = 'MEDIA'
  } else {
    analysis.severidad = analysis.severidad.toUpperCase()
  }

  // ── Guardar en DB ─────────────────────────────────────────────────────────
  const { data: saved, error: dbError } = await admin
    .from('visual_analyses')
    .insert({
      asset_tag: tag,
      inspector_id: userData?.id ?? user.id,
      severidad: analysis.severidad,
      diagnostico: analysis.diagnostico,
      base_metodologica: analysis.base_metodologica,
      recomendaciones: analysis.recomendaciones,
      foto_url: fotoUrl,
      fecha: new Date().toISOString(),
    })
    .select()
    .single()

  if (dbError) {
    console.error('[Visual Inspection] DB insert error:', dbError)
  }

  return NextResponse.json({
    id: saved?.id ?? null,
    tag,
    ...analysis,
    foto_url: fotoUrl,
    fecha: new Date().toISOString(),
    inspector_name: userData?.name ?? 'Inspector',
  })
}

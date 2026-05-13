# KIRA — Virtual Industry Assistant

Sistema de mantenimiento predictivo para operaciones mineras en Patagonia, Argentina.  
Stack: **Next.js 14 · Supabase · Claude API (Anthropic) · Tailwind CSS**

---

## Índice

1. [Stack técnico](#stack-técnico)
2. [Setup inicial](#setup-inicial)
3. [Estructura del proyecto](#estructura-del-proyecto)
4. [Módulos (M1–M14)](#módulos)
5. [Base de datos](#base-de-datos)
6. [APIs internas](#apis-internas)
7. [Modelos Claude por módulo](#modelos-claude-por-módulo)
8. [Variables de entorno](#variables-de-entorno)
9. [Migraciones SQL](#migraciones-sql)
10. [Deploy](#deploy)

---

## Stack técnico

| Capa | Tecnología |
|---|---|
| Framework | Next.js 14 (App Router) |
| Base de datos | Supabase (PostgreSQL + RLS + Storage) |
| Auth | Supabase Auth (email/password) |
| AI | Anthropic Claude API (Opus 4.5 / Sonnet 4.5 / Haiku 3.5) |
| Estilos | Tailwind CSS |
| Mapas | Leaflet (superficie) + canvas custom (subterráneo) |
| Excel | xlsx (server-side parsing) |
| Lenguaje | TypeScript |

---

## Setup inicial

```bash
# 1. Clonar y instalar
git clone <repo>
cd kira-virtual-industry-assistant
npm install

# 2. Variables de entorno
cp .env.example .env.local
# Completar .env.local con las keys reales

# 3. Migraciones SQL
# Ejecutar en orden en Supabase SQL Editor:
# supabase/migrations/001_audio_analyses_columns.sql
# supabase/migrations/002_skf_measurements_columns.sql
# supabase/migrations/003_structural_inspections.sql
# supabase/migrations/004_structural_reports.sql
# supabase/migrations/005_assets_geo.sql
# supabase/migrations/006_work_orders.sql
# supabase/migrations/007_avisos.sql
# supabase/migrations/008_manuals.sql
# supabase/migrations/009_inspection_plan.sql
# supabase/migrations/010_programa_inspeccion.sql
# supabase/migrations/011_assets_extra_cols.sql

# 4. Supabase Storage — crear buckets manualmente en el dashboard:
# - visual-analyses   (público)
# - structural-reports (público)
# - manuals           (público)

# 5. Correr en desarrollo
npm run dev
```

---

## Estructura del proyecto

```
app/
  (dashboard)/          # Rutas protegidas (layout con sidebar)
    page.tsx            # Home — grilla de módulos M1–M14
    geo/                # M6 Geolocalización
    work-orders/        # M7 Órdenes de Trabajo
    notices/            # M8 Avisos de Mantenimiento
    research/           # M1 AI Research
    visual-inspection/  # M2 Inspección Visual
    audio-vibration/    # M3 Audio & Vibración
    skf/                # M4 SKF QuickCollect
    structural-inspections/ # M5 Insp. Estructurales
    manuals/            # M9 Biblioteca Manuales
    dashboard/          # M10 Dashboard KPIs
    auxiliares/         # M11 Datos Auxiliares
    rca/                # M12 Análisis RCA
    inspection-plan/    # M13 Programa de Inspecciones
    admin/              # M14 Administración
  api/                  # API routes (server-side)
  actions/              # Server actions (auth logout)

components/             # Componentes React por módulo
lib/                    # Utilidades, tipos, clientes Supabase
  supabase/
    server.ts           # Client con cookies (SSR)
    client.ts           # Client browser
    admin.ts            # Service role — bypassa RLS
  geo/
    types.ts            # Tipos de activos y mapa
    constants.ts        # Configuración de minas y colores
    mock.ts             # Activos mock (fallback cuando DB vacía)

supabase/
  migrations/           # Scripts SQL en orden numérico
  wipe_all_data.sql     # Script para borrar todos los datos
```

---

## Módulos

| # | Módulo | Ruta | Claude | Descripción |
|---|---|---|---|---|
| M1 | AI Research | `/research` | Sonnet 4.5 | Chat especializado en mantenimiento industrial |
| M2 | Inspección Visual | `/visual-inspection` | Sonnet 4.5 | Análisis de imágenes térmicas y de campo |
| M3 | Audio & Vibración | `/audio-vibration` | Sonnet 4.5 | Pipeline DSP: TWF → FFT → PSD → Kurtosis → RMS |
| M4 | SKF QuickCollect | `/skf` | Haiku 3.5 | Velocity RMS + Envelope gE, ISO 10816 |
| M5 | Insp. Estructurales | `/structural-inspections` | Sonnet 4.5 | Scoring por sector (máx. 125), FRM y OT SAP |
| M6 | Geolocalización | `/geo` | — | Mapa satelital + planos subterráneos, 4 minas |
| M7 | Órdenes de Trabajo | `/work-orders` | — | KPIs HH programadas vs reales, import XLSX SAP |
| M8 | Avisos de Mantenimiento | `/notices` | — | Prioridades MI/MN/BKL/PP, vinculado a TAG |
| M9 | Biblioteca Manuales | `/manuals` | Haiku 3.5 | RAG con FTS PostgreSQL sobre PDFs/docs |
| M10 | Dashboard | `/dashboard` | — | KPIs operacionales en tiempo real |
| M11 | Datos Auxiliares | `/auxiliares` | — | Listas maestras: categorías, rutas, equipos, activos |
| M12 | Análisis RCA | `/rca` | Opus 4.5 | Ishikawa 6M + 5 Porqués + análisis IA |
| M13 | Programa de Inspecciones | `/inspection-plan` | — | Gantt 2026–2027 × 56 semanas + rutas por zona |
| M14 | Administración | `/admin` | — | Whitelist de usuarios, audit log tamper-proof |

---

## Base de datos

### Tablas principales

| Tabla | Módulo | Descripción |
|---|---|---|
| `users` | Auth | Perfil y rol de usuario (superusuario / inspector / supervisor) |
| `assets` | M6/M11 | Activos industriales con GPS/coordenadas subterráneas |
| `visual_analyses` | M2 | Diagnósticos de inspección visual |
| `audio_analyses` | M3 | Análisis de audio y vibración |
| `skf_measurements` | M4 | Mediciones SKF QuickCollect |
| `structural_inspections` | M5 | Inspecciones estructurales por sector |
| `structural_reports` | M5 | Informes de inspección estructural |
| `work_orders` | M7 | Órdenes de trabajo SAP |
| `notices` | M8 | Avisos de mantenimiento |
| `manuals` | M9 | Manuales cargados (metadatos) |
| `manual_chunks` | M9 | Fragmentos para FTS (tsvector) |
| `manual_sessions` | M9 | Sesiones de chat de manuales |
| `manual_messages` | M9 | Mensajes de chat de manuales |
| `rca_events` | M12 | Análisis RCA guardados |
| `inspection_programs` | M13 | Programas de inspección importados |
| `inspection_gantt_items` | M13 | Ítems del Gantt (activo × semanas) |
| `inspection_routes` | M13 | Rutas de inspección por zona |
| `programa_inspeccion` | M11 | Gantt de OTs (auxiliares) |
| `categorias` | M11 | Categorías de activos |
| `tipos_activo` | M11 | Tipos de activo |
| `rutas_inspeccion` | M11 | Rutas de inspección (lista maestra) |
| `equipos_trabajo` | M11 | Equipos de trabajo |
| `repuestos` | M11 | Repuestos SAP |
| `audit_logs` | M14 | Registro de auditoría tamper-proof |
| `whitelist` | M14 | Emails habilitados para registro |

### Roles de usuario

| Rol | Permisos |
|---|---|
| `superusuario` | Acceso total, import de datos, administración |
| `supervisor` | Lectura y escritura en módulos operacionales |
| `inspector` | Lectura + creación de inspecciones y análisis |

---

## APIs internas

### Auth
| Endpoint | Método | Descripción |
|---|---|---|
| `/api/` (Server Action) | POST | Logout |

### Activos
| Endpoint | Método | Descripción |
|---|---|---|
| `/api/assets` | GET | Lista todos los activos |
| `/api/assets` | POST | Crear activo individual |
| `/api/assets/import` | POST | Import masivo desde Excel (superusuario) |
| `/api/assets/gps` | PATCH | Actualizar coordenadas GPS de un activo |

### Análisis IA
| Endpoint | Método | Descripción |
|---|---|---|
| `/api/claude` | POST | Chat general (AI Research) |
| `/api/visual-inspection/analyze` | POST | Análisis de imagen con Claude Vision |
| `/api/audio-vibration/analyze` | POST | Análisis de audio/vibración |
| `/api/skf/analyze` | POST | Análisis SKF QuickCollect |
| `/api/structural/analyze` | POST | Análisis de inspección estructural |
| `/api/rca/analyze` | POST | Análisis RCA con Claude Opus |

### Módulos operacionales
| Endpoint | Método | Descripción |
|---|---|---|
| `/api/work-orders` | GET/POST/PATCH/DELETE | CRUD de OTs |
| `/api/notices` | GET/POST/PATCH/DELETE | CRUD de avisos |
| `/api/structural/save` | POST | Guardar inspección estructural |
| `/api/structural/reports` | GET/POST/DELETE | Informes estructurales |
| `/api/rca` | GET/POST | Historial y guardado de RCA |

### Manuales (RAG)
| Endpoint | Método | Descripción |
|---|---|---|
| `/api/manuals` | GET/POST/DELETE | CRUD de manuales |
| `/api/manuals/process` | POST | Procesar PDF → chunks FTS |
| `/api/manuals/chat` | POST | Query RAG con FTS + Claude |
| `/api/manuals/sessions` | GET/POST/DELETE | Sesiones de chat |
| `/api/manuals/messages` | GET | Mensajes de una sesión |

### Programa de Inspecciones
| Endpoint | Método | Descripción |
|---|---|---|
| `/api/inspection-plan` | GET | Programa activo + items + rutas |
| `/api/inspection-plan/import` | POST | Import XLSX (superusuario) |
| `/api/inspection-plan/programs` | GET | Historial de programas |

### Auxiliares
| Endpoint | Método | Descripción |
|---|---|---|
| `/api/auxiliares` | GET/POST/PATCH/DELETE | CRUD de listas maestras |
| `/api/auxiliares/gantt` | GET/POST/DELETE | Gantt de OTs |

### Admin
| Endpoint | Método | Descripción |
|---|---|---|
| `/api/admin/users` | GET/PATCH/DELETE | Gestión de usuarios |
| `/api/admin/whitelist` | GET/POST/DELETE | Lista blanca de emails |
| `/api/admin/audit-logs` | GET | Consulta de audit log |

---

## Modelos Claude por módulo

| Módulo | Modelo | Justificación |
|---|---|---|
| RCA | `claude-opus-4-5` | Razonamiento multi-causa complejo |
| Visual, Audio, Estructural, Research | `claude-sonnet-4-5` | Análisis técnico + visión |
| SKF, Manuales | `claude-haiku-4-5` | Respuestas rápidas, bajo costo |

**Costo relativo:** Haiku (1x) · Sonnet (~4x) · Opus (~19x)

---

## Variables de entorno

| Variable | Requerida | Descripción |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Anon key (pública) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Service role key (privada, server-side) |
| `ANTHROPIC_API_KEY` | ✅ | API key de Claude (console.anthropic.com) |

Ver `.env.example` para el formato exacto.

---

## Migraciones SQL

Ejecutar en el **SQL Editor de Supabase**, en orden numérico:

```
001_audio_analyses_columns.sql
002_skf_measurements_columns.sql
003_structural_inspections.sql
004_structural_reports.sql
005_assets_geo.sql
006_work_orders.sql
007_avisos.sql
008_manuals.sql
009_inspection_plan.sql
010_programa_inspeccion.sql
011_assets_extra_cols.sql
```

Para **borrar todos los datos** (mantiene estructura):
```
supabase/wipe_all_data.sql
```

---

## Deploy

### Vercel (recomendado)
1. Conectar repo en vercel.com
2. Agregar las 4 variables de entorno en Settings → Environment Variables
3. Deploy automático en cada push a `main`

### Consideraciones
- `maxDuration = 60` en routes de procesamiento de manuales (requiere plan Vercel Pro)
- Storage de Supabase: configurar los 3 buckets como públicos para acceso a URLs de imágenes/PDFs
- Las RLS policies permiten lectura a cualquier usuario autenticado; escritura depende del rol

---

*KIRA v0.1 · ~420 activos · 4 minas + superficie · Patagonia, Argentina*  
*ISO 10816 · ASME B30 · API 653 · ISO 45001*

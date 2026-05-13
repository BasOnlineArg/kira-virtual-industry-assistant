-- ─────────────────────────────────────────────────────────────────────────────
-- KIRA — WIPE ALL DATA (mantiene estructura, borra solo registros)
-- Ejecutar en Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- Orden inverso a las FK para evitar errores de constraint

-- Módulo Inspecciones
TRUNCATE TABLE inspection_gantt_items  RESTART IDENTITY CASCADE;
TRUNCATE TABLE inspection_routes       RESTART IDENTITY CASCADE;
TRUNCATE TABLE inspection_programs     RESTART IDENTITY CASCADE;

-- Módulo Gantt OTs (Auxiliares)
TRUNCATE TABLE programa_inspeccion     RESTART IDENTITY CASCADE;

-- Módulo Manuales
TRUNCATE TABLE manual_messages         RESTART IDENTITY CASCADE;
TRUNCATE TABLE manual_sessions         RESTART IDENTITY CASCADE;
TRUNCATE TABLE manual_chunks           RESTART IDENTITY CASCADE;
TRUNCATE TABLE manuals                 RESTART IDENTITY CASCADE;

-- Módulo RCA
TRUNCATE TABLE rca_analyses            RESTART IDENTITY CASCADE;

-- Módulo Inspecciones Estructurales
TRUNCATE TABLE structural_reports      RESTART IDENTITY CASCADE;
TRUNCATE TABLE structural_inspections  RESTART IDENTITY CASCADE;

-- Módulo Audio & Vibración
TRUNCATE TABLE audio_analyses          RESTART IDENTITY CASCADE;

-- Módulo Inspección Visual
TRUNCATE TABLE visual_analyses         RESTART IDENTITY CASCADE;

-- Módulo SKF
TRUNCATE TABLE skf_measurements        RESTART IDENTITY CASCADE;

-- Módulo OTs y Avisos
TRUNCATE TABLE work_orders             RESTART IDENTITY CASCADE;
TRUNCATE TABLE notices                 RESTART IDENTITY CASCADE;

-- Tablas auxiliares (listas maestras)
TRUNCATE TABLE repuestos               RESTART IDENTITY CASCADE;
TRUNCATE TABLE equipos_trabajo         RESTART IDENTITY CASCADE;
TRUNCATE TABLE rutas_inspeccion        RESTART IDENTITY CASCADE;
TRUNCATE TABLE categorias              RESTART IDENTITY CASCADE;
TRUNCATE TABLE tipos_activo            RESTART IDENTITY CASCADE;

-- Activos (geo) — al final porque otros pueden referenciarlos
TRUNCATE TABLE assets                  RESTART IDENTITY CASCADE;

-- ─── NO TRUNCAR ──────────────────────────────────────────────────────────────
-- auth.users         → usuarios de Supabase Auth (se borran desde Dashboard)
-- public.users       → perfil/rol de cada usuario (dejar al menos el superusuario)
-- audit_logs         → historial de auditoría (opcional, comentar si se quiere borrar)
-- ─────────────────────────────────────────────────────────────────────────────

-- Si también querés limpiar audit logs:
-- TRUNCATE TABLE audit_logs RESTART IDENTITY CASCADE;

-- Verificación post-wipe
SELECT
  'inspection_gantt_items'  AS tabla, COUNT(*) AS registros FROM inspection_gantt_items  UNION ALL
SELECT 'inspection_routes',           COUNT(*) FROM inspection_routes                    UNION ALL
SELECT 'inspection_programs',         COUNT(*) FROM inspection_programs                  UNION ALL
SELECT 'assets',                      COUNT(*) FROM assets                               UNION ALL
SELECT 'visual_analyses',             COUNT(*) FROM visual_analyses                      UNION ALL
SELECT 'audio_analyses',              COUNT(*) FROM audio_analyses                       UNION ALL
SELECT 'work_orders',                 COUNT(*) FROM work_orders                          UNION ALL
SELECT 'notices',                     COUNT(*) FROM notices;

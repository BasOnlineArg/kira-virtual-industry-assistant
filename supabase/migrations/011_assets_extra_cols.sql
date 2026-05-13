-- ─── Assets: columnas adicionales del Registro Maestro ───────────────────────

ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS ub_tecnica       text,           -- FL code SAP (ej: 3113-10-00-11)
  ADD COLUMN IF NOT EXISTS ubicacion_fisica text,           -- Ubicación Física (descripción)
  ADD COLUMN IF NOT EXISTS ruta_zona        text,           -- Ruta / Zona de inspección
  ADD COLUMN IF NOT EXISTS frec_sem         numeric,        -- Frecuencia en semanas
  ADD COLUMN IF NOT EXISTS hh_ocurr         numeric,        -- HH por ocurrencia
  ADD COLUMN IF NOT EXISTS hh_anual         numeric;        -- HH anual total

-- ─── Módulo: Programa de Inspecciones ────────────────────────────────────────

-- Metadatos de cada archivo importado
create table if not exists inspection_programs (
  id           uuid primary key default gen_random_uuid(),
  filename     text not null,
  uploaded_by  uuid references auth.users(id),
  uploaded_at  timestamptz default now(),
  is_active    boolean default true,
  total_assets int,
  notes        text
);

alter table inspection_programs enable row level security;
create policy "insp_prog_read"   on inspection_programs for select using (auth.role() = 'authenticated');
create policy "insp_prog_insert" on inspection_programs for insert with check (auth.role() = 'authenticated');
create policy "insp_prog_update" on inspection_programs for update using (auth.role() = 'authenticated');

-- Items del Gantt (un registro por activo, con las semanas programadas en JSONB)
create table if not exists inspection_gantt_items (
  id              uuid primary key default gen_random_uuid(),
  program_id      uuid references inspection_programs(id) on delete cascade,
  asset_num       int,
  categoria       text,
  codigo          text,
  equipo          text,
  area            text,
  ruta            text,
  hh              numeric,
  scheduled_weeks jsonb not null default '[]'
  -- Formato: [{"week": 22, "year": 2026}, {"week": 26, "year": 2026}, ...]
);

alter table inspection_gantt_items enable row level security;
create policy "insp_items_read"   on inspection_gantt_items for select using (auth.role() = 'authenticated');
create policy "insp_items_insert" on inspection_gantt_items for insert with check (auth.role() = 'authenticated');

-- Rutas de inspección (resumen por ruta)
create table if not exists inspection_routes (
  id             uuid primary key default gen_random_uuid(),
  program_id     uuid references inspection_programs(id) on delete cascade,
  ruta_zona      text not null,
  frec_visual    text,
  jornada_campo  text,
  activos_count  int,
  hh_semana      text,
  composicion    text,
  sort_order     int default 0
);

alter table inspection_routes enable row level security;
create policy "insp_routes_read"   on inspection_routes for select using (auth.role() = 'authenticated');
create policy "insp_routes_insert" on inspection_routes for insert with check (auth.role() = 'authenticated');

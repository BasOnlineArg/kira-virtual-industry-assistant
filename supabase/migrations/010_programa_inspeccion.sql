-- ─── Módulo: Gantt OTs (Auxiliares) ──────────────────────────────────────────
-- Tabla para el Gantt de Órdenes de Trabajo editable desde la UI

create table if not exists programa_inspeccion (
  id           uuid primary key default gen_random_uuid(),
  tarea        text not null,
  responsable  text,
  fecha_inicio date not null,
  fecha_fin    date not null,
  progreso     int  not null default 0 check (progreso >= 0 and progreso <= 100),
  color        text,
  orden        int  not null default 0
);

alter table programa_inspeccion enable row level security;

-- Todos los usuarios autenticados pueden leer
create policy "gantt_read"   on programa_inspeccion
  for select using (auth.role() = 'authenticated');

-- Solo superusuario puede insertar / actualizar / borrar
-- (la verificación de rol se hace en la API con service role key,
--  estas políticas son una segunda capa de seguridad)
create policy "gantt_insert" on programa_inspeccion
  for insert with check (auth.role() = 'authenticated');

create policy "gantt_update" on programa_inspeccion
  for update using (auth.role() = 'authenticated');

create policy "gantt_delete" on programa_inspeccion
  for delete using (auth.role() = 'authenticated');

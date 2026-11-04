-- Mail Guard · minería de datos con RapidMiner (idempotente).
-- Tablas aisladas con prefijo mineria_: no tocan mail_scans ni profiles.
--
--   mineria_correos       → 100.000 registros crudos (80 % limpios, 10 % outliers, 10 % sucios).
--                           Se cargan con: bun mineria-datos/cargar-supabase.ts
--   mineria_predicciones  → salida de RapidMiner: predicción sobre el 20 % de prueba.
--   mineria_metricas      → salida de RapidMiner: exactitud, kappa, etc.
--
-- RapidMiner y el script de carga usan el rol "mineria" (solo estas tablas). El panel web solo lee.

-- ── Datos crudos ─────────────────────────────────────────────────────────
-- Celdas vacías → NULL real. El texto literal 'NULL' se conserva tal cual (también en
-- columnas de texto) para que RapidMiner lo declare faltante con Declare Missing Value.
-- id_correo NO es único a propósito: hay 3.000 duplicados exactos.
create table if not exists public.mineria_correos (
  fila bigint generated always as identity primary key,
  id_correo text,
  fecha_analisis text,
  proveedor text,
  dominio_remitente text,
  tipo_dominio text,
  longitud_asunto integer,
  longitud_cuerpo integer,
  num_enlaces integer,
  enlaces_acortados integer,
  enlaces_con_ip integer,
  dominio_imita_marca text,
  usa_punycode text,
  palabras_urgencia integer,
  solicita_credenciales text,
  nombre_coincide_dominio text,
  tiene_adjunto text,
  antiguedad_dominio_dias integer,
  hora_envio integer,
  porcentaje_mayusculas double precision,
  veredicto text
);

-- ── Resultados de RapidMiner ─────────────────────────────────────────────
-- Sin restricciones fuertes: RapidMiner (Write Database) inserta las columnas
-- que produce Apply Model. Las de confianza llegan con su nombre en minúsculas.
create table if not exists public.mineria_predicciones (
  id_correo text,
  veredicto text,
  prediction_veredicto text,
  confidence_seguro double precision,
  confidence_sospechoso double precision,
  confidence_peligroso double precision,
  created_at timestamptz not null default now()
);

create table if not exists public.mineria_metricas (
  criterio text,
  valor double precision,
  created_at timestamptz not null default now()
);

alter table public.mineria_correos enable row level security;
alter table public.mineria_predicciones enable row level security;
alter table public.mineria_metricas enable row level security;

-- Lectura para usuarios autenticados del panel (datos sintéticos, no personales).
drop policy if exists "Authenticated can read mining predictions" on public.mineria_predicciones;
create policy "Authenticated can read mining predictions" on public.mineria_predicciones
  for select to authenticated using (true);

drop policy if exists "Authenticated can read mining metrics" on public.mineria_metricas;
create policy "Authenticated can read mining metrics" on public.mineria_metricas
  for select to authenticated using (true);
-- mineria_correos no tiene política: el panel lee sus agregados por función (más abajo, cuando
-- se construya la página de visualización), nunca las 100.000 filas.

-- ── Rol de RapidMiner ─────────────────────────────────────────────────────
-- Usuario con acceso exclusivo a las tablas mineria_. La contraseña NO se versiona:
-- se fija en el SQL Editor con  alter role mineria password '...';
-- Usuario para el pooler de Supabase:  mineria.<project_ref>
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'mineria') then
    create role mineria login;
  end if;
end $$;

grant usage on schema public to mineria;
grant select, insert, update, delete, truncate
  on public.mineria_correos, public.mineria_predicciones, public.mineria_metricas to mineria;

drop policy if exists "Mining role full access" on public.mineria_correos;
create policy "Mining role full access" on public.mineria_correos for all to mineria using (true) with check (true);
drop policy if exists "Mining role full access" on public.mineria_predicciones;
create policy "Mining role full access" on public.mineria_predicciones for all to mineria using (true) with check (true);
drop policy if exists "Mining role full access" on public.mineria_metricas;
create policy "Mining role full access" on public.mineria_metricas for all to mineria using (true) with check (true);

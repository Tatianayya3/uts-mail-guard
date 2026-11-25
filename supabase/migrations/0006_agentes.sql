-- Mail Guard · agentes inteligentes (idempotente: se puede ejecutar varias veces).
-- Ejecutar en Supabase → SQL Editor, después de 0001 y 0002.
--
-- Agente Centinela (deliberativo, automático): percibe los análisis de todos
-- los usuarios de forma AGREGADA (solo dominio y conteos, nunca contenido),
-- decide qué dominios son campañas activas y actúa: los publica en la base de
-- conocimiento (threat_domains) y avisa a los usuarios expuestos (agent_alerts).
-- El Agente Analista consulta threat_domains antes de dar su veredicto.
--
-- Escritura: solo el rol service_role (la clave secreta del history-service).
-- Lectura: usuarios autenticados (amenazas y bitácora son datos globales sin
-- información personal; las alertas, solo las propias).

-- ── Base de conocimiento: dominios señalados por el Centinela ────────────
create table if not exists public.threat_domains (
  domain text primary key,
  level text not null check (level in ('suspicious', 'dangerous')),
  dangerous_reports integer not null default 0,
  suspicious_reports integer not null default 0,
  affected_users integer not null default 0,
  priority numeric(8,2) not null default 0,
  reason text not null default '',
  active boolean not null default true,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists threat_domains_active_idx
  on public.threat_domains (active, priority desc);

alter table public.threat_domains enable row level security;
drop policy if exists "Authenticated can read threats" on public.threat_domains;
create policy "Authenticated can read threats" on public.threat_domains
  for select to authenticated using (true);

-- ── Bitácora de ejecuciones (percepción → deliberación → acción) ─────────
create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  agent text not null default 'sentinel',
  trigger text not null check (trigger in ('automatic', 'manual', 'event')),
  status text not null check (status in ('completed', 'failed')),
  started_at timestamptz not null,
  finished_at timestamptz not null,
  perceived jsonb not null default '{}'::jsonb,
  decisions jsonb not null default '[]'::jsonb,
  actions jsonb not null default '[]'::jsonb,
  summary text not null default ''
);

create index if not exists agent_runs_started_idx
  on public.agent_runs (agent, started_at desc);

alter table public.agent_runs enable row level security;
drop policy if exists "Authenticated can read agent runs" on public.agent_runs;
create policy "Authenticated can read agent runs" on public.agent_runs
  for select to authenticated using (true);

-- ── Alertas para los usuarios expuestos ──────────────────────────────────
create table if not exists public.agent_alerts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  -- Sin FK: las alertas se crean durante la ejecución, antes de guardar su bitácora.
  run_id uuid,
  domain text not null,
  level text not null check (level in ('suspicious', 'dangerous')),
  title text not null,
  message text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  -- Un aviso por usuario, dominio y nivel: una escalada genera uno nuevo.
  unique (profile_id, domain, level)
);

create index if not exists agent_alerts_profile_idx
  on public.agent_alerts (profile_id, created_at desc);

alter table public.agent_alerts enable row level security;
drop policy if exists "Users can read own alerts" on public.agent_alerts;
create policy "Users can read own alerts" on public.agent_alerts
  for select to authenticated using ((select auth.uid()) = profile_id);
drop policy if exists "Users can mark own alerts" on public.agent_alerts;
create policy "Users can mark own alerts" on public.agent_alerts
  for update to authenticated
  using ((select auth.uid()) = profile_id) with check ((select auth.uid()) = profile_id);

-- Índice para la percepción del Centinela (agregado por dominio y fecha).
create index if not exists mail_scans_domain_analyzed_idx
  on public.mail_scans (sender_domain, analyzed_at desc);

-- ── Sensor: observaciones agregadas por dominio ──────────────────────────
-- Devuelve solo conteos; el agente nunca ve asuntos, textos ni correos.
-- Los veredictos que ya incluyen el conocimiento del Centinela (modelo
-- «… + centinela») no cuentan como reportes: así el agente no se confirma a
-- sí mismo en bucle. Sí cuentan para la última actividad del dominio.
create or replace function public.sentinel_observations(p_since timestamptz)
returns table (
  domain text,
  dangerous_reports integer,
  suspicious_reports integer,
  safe_reports integer,
  affected_users integer,
  last_seen_at timestamptz
)
language sql stable set search_path = public as $$
  select
    lower(sender_domain) as domain,
    count(*) filter (where verdict = 'dangerous' and model not like '%centinela%')::int,
    count(*) filter (where verdict = 'suspicious' and model not like '%centinela%')::int,
    count(*) filter (where verdict = 'safe')::int,
    count(distinct profile_id)::int,
    max(analyzed_at)
  from public.mail_scans
  where analyzed_at >= p_since and sender_domain <> '' and sender_domain <> 'desconocido'
  group by lower(sender_domain);
$$;

revoke all on function public.sentinel_observations(timestamptz) from public, anon, authenticated;
grant execute on function public.sentinel_observations(timestamptz) to service_role;

-- ── Actuador: avisar a los usuarios que recibieron correos del dominio ───
create or replace function public.sentinel_alert_exposed_users(
  p_domain text,
  p_level text,
  p_run_id uuid,
  p_title text,
  p_message text
)
returns integer
language plpgsql security definer set search_path = public as $$
declare
  created integer;
begin
  insert into public.agent_alerts (profile_id, run_id, domain, level, title, message)
  select distinct s.profile_id, p_run_id, lower(p_domain), p_level, p_title, p_message
  from public.mail_scans s
  where lower(s.sender_domain) = lower(p_domain)
  on conflict (profile_id, domain, level) do nothing;
  get diagnostics created = row_count;
  return created;
end;
$$;

revoke all on function public.sentinel_alert_exposed_users(text, text, uuid, text, text) from public, anon, authenticated;
grant execute on function public.sentinel_alert_exposed_users(text, text, uuid, text, text) to service_role;

-- ── Privacidad: borrar el historial también borra las alertas propias ────
create or replace function public.delete_my_history()
returns integer language plpgsql security definer set search_path = public as $$
declare
  removed integer;
begin
  delete from public.mail_scans where profile_id = auth.uid();
  get diagnostics removed = row_count;
  delete from public.profile_analytics where profile_id = auth.uid();
  delete from public.agent_alerts where profile_id = auth.uid();
  return removed;
end;
$$;

revoke all on function public.delete_my_history() from public;
grant execute on function public.delete_my_history() to authenticated;

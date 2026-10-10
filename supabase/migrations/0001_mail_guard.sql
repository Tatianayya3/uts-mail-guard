-- Mail Guard · esquema de datos (idempotente: se puede ejecutar varias veces)
-- Ejecutar en Supabase → SQL Editor.

-- ── Perfiles ─────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text default 'user',
  display_name text,
  avatar_url text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- Crea el perfil al registrarse. Solo se instala si el proyecto no tiene ya
-- su propio trigger sobre auth.users (para no duplicar perfiles).
create or replace function public.mail_guard_handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'auth.users'::regclass and not tgisinternal
      and tgname <> 'mail_guard_on_auth_user_created'
  ) then
    drop trigger if exists mail_guard_on_auth_user_created on auth.users;
    create trigger mail_guard_on_auth_user_created
      after insert on auth.users
      for each row execute function public.mail_guard_handle_new_user();
  end if;
end $$;

-- Perfiles para usuarios que ya existían antes de esta migración.
insert into public.profiles (id, display_name)
select id, raw_user_meta_data->>'full_name' from auth.users
on conflict (id) do nothing;

-- ── Análisis ─────────────────────────────────────────────────────────────
create table if not exists public.mail_scans (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  provider text not null,
  subject text not null default '',
  sender_email text not null,
  sender_domain text not null,
  sender_display_name text not null default '',
  trust_score smallint not null check (trust_score between 0 and 100),
  verdict text not null check (verdict in ('safe', 'suspicious', 'dangerous', 'unknown')),
  summary text not null default '',
  advice text not null default '',
  signals jsonb not null default '[]'::jsonb,
  links jsonb not null default '[]'::jsonb,
  model text not null default '',
  analyzed_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.mail_scans add column if not exists email_hash text;

create index if not exists mail_scans_profile_created_idx
  on public.mail_scans (profile_id, created_at desc);
create index if not exists mail_scans_profile_domain_idx
  on public.mail_scans (profile_id, sender_domain);

-- Deduplicación: un mismo correo se guarda una sola vez por usuario.
-- (NULL no colisiona, así que los análisis sin huella siempre se insertan.)
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'mail_scans_profile_hash_key') then
    delete from public.mail_scans a using public.mail_scans b
      where a.email_hash is not null and a.profile_id = b.profile_id
        and a.email_hash = b.email_hash and a.created_at > b.created_at;
    alter table public.mail_scans
      add constraint mail_scans_profile_hash_key unique (profile_id, email_hash);
  end if;
end $$;
drop index if exists mail_scans_profile_hash_idx;

alter table public.mail_scans enable row level security;

drop policy if exists "Users can insert their own scans" on public.mail_scans;
create policy "Users can insert their own scans" on public.mail_scans
  for insert to authenticated with check ((select auth.uid()) = profile_id);

drop policy if exists "Users can read their own scans" on public.mail_scans;
create policy "Users can read their own scans" on public.mail_scans
  for select to authenticated using ((select auth.uid()) = profile_id);

-- ── Métricas agregadas ───────────────────────────────────────────────────
create table if not exists public.profile_analytics (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  total_scans integer not null default 0,
  safe_scans integer not null default 0,
  suspicious_scans integer not null default 0,
  dangerous_scans integer not null default 0,
  unknown_scans integer not null default 0,
  links_reviewed integer not null default 0,
  average_trust_score numeric(5,2) not null default 0,
  last_scanned_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.profile_analytics enable row level security;

drop policy if exists "Users can read their own analytics" on public.profile_analytics;
create policy "Users can read their own analytics" on public.profile_analytics
  for select to authenticated using ((select auth.uid()) = profile_id);

create or replace function public.refresh_profile_analytics()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profile_analytics as pa (
    profile_id, total_scans, safe_scans, suspicious_scans, dangerous_scans,
    unknown_scans, links_reviewed, average_trust_score, last_scanned_at, updated_at
  ) values (
    new.profile_id, 1,
    (new.verdict = 'safe')::int, (new.verdict = 'suspicious')::int,
    (new.verdict = 'dangerous')::int, (new.verdict = 'unknown')::int,
    jsonb_array_length(new.links), new.trust_score, new.analyzed_at, now()
  )
  on conflict (profile_id) do update set
    total_scans = pa.total_scans + 1,
    safe_scans = pa.safe_scans + (new.verdict = 'safe')::int,
    suspicious_scans = pa.suspicious_scans + (new.verdict = 'suspicious')::int,
    dangerous_scans = pa.dangerous_scans + (new.verdict = 'dangerous')::int,
    unknown_scans = pa.unknown_scans + (new.verdict = 'unknown')::int,
    links_reviewed = pa.links_reviewed + jsonb_array_length(new.links),
    average_trust_score = ((pa.average_trust_score * pa.total_scans) + new.trust_score) / (pa.total_scans + 1),
    last_scanned_at = greatest(pa.last_scanned_at, new.analyzed_at),
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists mail_scans_refresh_analytics on public.mail_scans;
create trigger mail_scans_refresh_analytics
  after insert on public.mail_scans
  for each row execute function public.refresh_profile_analytics();

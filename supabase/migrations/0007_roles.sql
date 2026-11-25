-- Mail Guard · roles de usuario (idempotente: se puede ejecutar varias veces).
-- Ejecutar en Supabase → SQL Editor, después de 0001–0006.
--
-- Dos roles: 'user' (por defecto) y 'admin'. El panel y los servicios deciden
-- qué mostrar y qué permitir según profiles.role.

-- ── Valores válidos ──────────────────────────────────────────────────────
update public.profiles set role = 'user' where role is null or role not in ('user', 'admin');
alter table public.profiles alter column role set default 'user';
alter table public.profiles alter column role set not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_role_check') then
    alter table public.profiles
      add constraint profiles_role_check check (role in ('user', 'admin'));
  end if;
end $$;

-- ── Seguridad: nadie puede cambiarse el rol a sí mismo ───────────────────
-- La política «Users can update own profile» permitía actualizar la fila
-- completa, incluido role: cualquiera podía volverse admin con la clave
-- publicable. Ahora el rol autenticado solo puede escribir estas columnas;
-- el cambio de rol lo hace el history-service con la clave secreta, después
-- de comprobar que quien lo pide es admin.
revoke update on public.profiles from authenticated, anon;
grant update (display_name, avatar_url) on public.profiles to authenticated;

-- ── Bitácora del Centinela: solo la ven los admins ───────────────────────
drop policy if exists "Authenticated can read agent runs" on public.agent_runs;
drop policy if exists "Admins can read agent runs" on public.agent_runs;
create policy "Admins can read agent runs" on public.agent_runs
  for select to authenticated using (
    exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = 'admin'
    )
  );

-- Para nombrar los primeros admins, ejecuta una vez en el SQL Editor
-- (con los correos reales; no los guardes en el repositorio):
--
--   update public.profiles set role = 'admin'
--   where id in (select id from auth.users where email in ('correo1@…', 'correo2@…'));

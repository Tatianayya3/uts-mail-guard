-- Mail Guard · roles de usuario (idempotente: se puede ejecutar varias veces).
-- Ejecutar en Supabase → SQL Editor, después de 0001–0006.
--
-- Dos roles: 'user' (por defecto) y 'admin'. El panel y los servicios deciden
-- qué mostrar y qué permitir según profiles.role.
--
-- profiles.role puede ser `text` (como lo crea 0001) o un ENUM propio del
-- proyecto (p. ej. `roles`). Este script funciona con los dos: si es enum,
-- le agrega los valores que falten. Postgres no deja USAR un valor de enum
-- recién agregado hasta que termina la transacción, por eso aquí todas las
-- comparaciones se hacen como texto (role::text).

-- ── Valores válidos ──────────────────────────────────────────────────────
do $$
declare
  role_type regtype;
  is_enum boolean;
begin
  select a.atttypid::regtype, t.typtype = 'e'
    into role_type, is_enum
  from pg_attribute a
  join pg_type t on t.oid = a.atttypid
  where a.attrelid = 'public.profiles'::regclass
    and a.attname = 'role' and not a.attisdropped;

  if is_enum then
    execute format('alter type %s add value if not exists %L', role_type, 'user');
    execute format('alter type %s add value if not exists %L', role_type, 'admin');
  else
    -- Columna de texto: restringe a los dos roles. NOT VALID no revisa filas
    -- antiguas (la app trata cualquier otro valor como 'user').
    if not exists (select 1 from pg_constraint where conname = 'profiles_role_check') then
      alter table public.profiles
        add constraint profiles_role_check
        check (role::text in ('user', 'admin')) not valid;
    end if;
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
      where p.id = (select auth.uid()) and p.role::text = 'admin'
    )
  );

-- Para nombrar los primeros admins, ejecuta APARTE (en otra ejecución, para
-- que el valor 'admin' del enum ya exista) con los correos reales; no los
-- guardes en el repositorio:
--
--   update public.profiles set role = 'admin'
--   where id in (select id from auth.users where email in ('correo1@…', 'correo2@…'));

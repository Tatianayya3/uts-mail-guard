# Mail Guard

Extensión de Chrome para analizar el correo visible en Gmail y Outlook. La extensión extrae un snapshot limitado del correo, lo envía al backend Next.js y muestra un resultado normalizado.

## Arquitectura

```text
Gmail / Outlook
    -> extension-web
    -> extension-dashboard /api/scan
    -> proveedor de IA
    -> respuesta validada con @mail-guard/scan-contract
    -> AnalysisResult
```

La API key de IA y las credenciales de Upstash viven únicamente en Next.js. Nunca las pongas en `VITE_*`, React, el manifest ni el código de la extensión.

## Estructura

- `apps/extension-web`: popup, permisos de Chrome y extracción del correo.
- `apps/extension-dashboard`: aplicación Next.js y endpoint server-side `/api/scan`.
- `packages/scan-contract`: schemas Zod compartidos para request y respuesta de IA.
- `packages/supabase`: cliente y APIs compartidas de Supabase.

## Requisitos

- Node.js 24 o superior.
- Bun 1.4.2.
- Una cuenta de Supabase.
- Un proveedor compatible con OpenAI Chat Completions, por ejemplo Gemini mediante su endpoint compatible.
- Upstash Redis para límites distribuidos.

## Variables de entorno

### Backend Next.js

Copia `apps/extension-dashboard/.env.example` a `apps/extension-dashboard/.env`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=tu-clave-publicable

AI_API_URL=https://generativelanguage.googleapis.com/v1beta/openai/chat/completions
AI_API_KEY=tu-clave-privada-de-ia
AI_MODEL=gemini-2.5-flash

SCAN_ANONYMOUS_LIMIT=5
SCAN_AUTHENTICATED_LIMIT=100

UPSTASH_REDIS_REST_URL=https://tu-db.upstash.io
UPSTASH_REDIS_REST_TOKEN=tu-token-privado

EXTENSION_ORIGIN=*
```

`NEXT_PUBLIC_*` no son secretos. `AI_API_KEY` y `UPSTASH_REDIS_REST_TOKEN` sí lo son.

### Extensión

Copia `apps/extension-web/.env.example` a `apps/extension-web/.env`:

```env
VITE_SCAN_API_URL=http://localhost:3000
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=tu-clave-publicable
```

`VITE_SCAN_API_URL` se incorpora al bundle durante el build. Después de cambiarlo debes volver a compilar la extensión.

## Prompt para tu proveedor de IA

El backend ya envía un prompt base. Si vas a cambiarlo, conserva estas reglas:

````text
Eres un analista de seguridad de correo electrónico.

Analiza el snapshot recibido y detecta señales de phishing, suplantación,
dominios sospechosos, enlaces peligrosos y patrones anómalos.

Reglas:
1. No afirmes que SPF, DKIM o DMARC pasaron si no recibiste evidencia técnica.
2. Distingue entre dominio con formato válido y dominio confiable.
3. Si falta evidencia, usa "unknown".
4. No inventes nombres, encabezados, URLs ni resultados de autenticación.
5. Devuelve únicamente JSON válido, sin Markdown, sin ``` y sin texto adicional.
6. trustScore debe ser un entero entre 0 y 100.
7. verdict debe ser exactamente "safe", "suspicious", "dangerous" o "unknown".

Devuelve exactamente este objeto:
{
  "trustScore": 0,
  "verdict": "unknown",
  "summary": "Resumen breve en español.",
  "sender": {
    "email": "remitente@dominio.com",
    "domain": "dominio.com",
    "domainStatus": "unknown",
    "displayName": "Nombre del remitente"
  },
  "signals": [
    {
      "key": "sender",
      "label": "Remitente",
      "value": "Resultado",
      "status": "unknown",
      "detail": "Evidencia disponible o explicación de incertidumbre."
    }
  ],
  "links": [
    {
      "url": "https://dominio.com",
      "label": "Destino",
      "status": "unknown",
      "detail": "Resultado del análisis del enlace."
    }
  ],
  "model": "nombre-del-modelo",
  "analyzedAt": "2026-09-14T00:00:00.000Z"
}
````

El backend valida la respuesta con `scanAnalysisSchema`. Si el proveedor devuelve otro formato, el análisis falla de forma controlada.

## Ejecutar todo en local

Instala dependencias desde la raíz:

```bash
bun install
```

Inicia Next.js y la extensión con Turbo:

```bash
bun run dev
```

Para iniciarlos por separado:

```bash
cd apps/extension-dashboard
bun run dev
```

```bash
cd apps/extension-web
bun run dev
```

El backend queda normalmente en `http://localhost:3000`. La extensión usa `VITE_SCAN_API_URL=http://localhost:3000`.

## Cargar la extensión en Chrome

1. Ejecuta `bun run build` desde `apps/extension-web`.
2. Abre `chrome://extensions`.
3. Activa **Developer mode**.
4. Pulsa **Load unpacked**.
5. Selecciona `apps/extension-web/dist`.
6. Recarga la extensión después de cambiar el manifest o las variables `VITE_*`.

Para probar el escaneo, abre un correo real en Gmail u Outlook y luego abre el popup.

## Desplegar Next.js en Vercel

1. Importa el repositorio en Vercel.
2. Configura el root directory como `apps/extension-dashboard`.
3. Mantén el framework como Next.js.
4. Añade en Vercel las variables del backend:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `AI_API_URL`
   - `AI_API_KEY`
   - `AI_MODEL`
   - `SCAN_ANONYMOUS_LIMIT`
   - `SCAN_AUTHENTICATED_LIMIT`
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
   - `EXTENSION_ORIGIN`
5. Despliega y prueba `https://tu-app.vercel.app/api/scan`.

Después cambia en `apps/extension-web/.env`:

```env
VITE_SCAN_API_URL=https://tu-app.vercel.app
```

Vuelve a ejecutar `bun run build` en la extensión y carga de nuevo `apps/extension-web/dist` en Chrome.

## CORS y manifest en producción

Durante desarrollo `EXTENSION_ORIGIN=*` es práctico. En producción usa el origen exacto de la extensión:

```env
EXTENSION_ORIGIN=chrome-extension://ID_DE_TU_EXTENSION
```

El `host_permissions` del manifest debe incluir el dominio de Vercel. Añade el dominio final y vuelve a compilar:

```ts
host_permissions: [
  "https://mail.google.com/*",
  "https://outlook.live.com/*",
  "https://outlook.office.com/*",
  "https://tu-app.vercel.app/*",
];
```

No uses `<all_urls>` para esta extensión.

## Cuotas

- Usuario anónimo: `SCAN_ANONYMOUS_LIMIT`, por defecto 5 análisis diarios.
- Usuario autenticado: `SCAN_AUTHENTICATED_LIMIT`, por defecto 100 análisis diarios.

Upstash es necesario para que la cuota funcione correctamente en múltiples instancias serverless. Sin sus variables, el endpoint responde `503` y no consume IA.

## Seguridad antes de producción

- Rota inmediatamente cualquier secreto que haya sido publicado en un `.env.example`, commit, log o captura.
- Verifica que `.env*` esté ignorado por Git, excepto los archivos `.env.example` sin secretos.
- Limita tamaño de texto y cantidad de enlaces; el endpoint ya aplica esos límites.
- No envíes adjuntos ni el cuerpo completo si no son necesarios.
- Define políticas de retención y privacidad para el contenido del correo.
- Registra métricas sin guardar el contenido sensible del email.
- Añade autenticación de servicio, rate limiting y monitoreo antes de abrir el endpoint públicamente.
- Configura Supabase RLS para perfiles y cualquier tabla de historial.
- Un dominio con formato válido no equivale a un dominio confiable; SPF, DKIM, DMARC y reputación requieren evidencia.

## Validación

```bash
cd apps/extension-dashboard && bun run build
cd ../extension-web && bun run build
```

También puedes ejecutar desde la raíz:

```bash
bun run build
```

## Historial y analíticas en Supabase

Los análisis anónimos no se guardan en Supabase: se mantienen temporalmente en `localStorage`. Cuando el usuario inicia sesión, la extensión intenta sincronizar hasta 25 análisis pendientes.

Los usuarios autenticados guardan cada resultado en `public.mail_scans`. El `profile_id` se obtiene del token mediante `auth.uid()`, por lo que la extensión nunca puede escribir datos en el perfil de otro usuario.

Ejecuta este SQL en Supabase SQL Editor:

```sql
create table if not exists public.mail_scans (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
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

create index if not exists mail_scans_profile_created_idx
  on public.mail_scans(profile_id, created_at desc);

create index if not exists mail_scans_profile_domain_idx
  on public.mail_scans(profile_id, sender_domain);

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

alter table public.mail_scans enable row level security;
alter table public.profile_analytics enable row level security;

create policy "Users can insert their own scans"
  on public.mail_scans for insert to authenticated
  with check (auth.uid() = profile_id);

create policy "Users can read their own scans"
  on public.mail_scans for select to authenticated
  using (auth.uid() = profile_id);

create policy "Users can read their own analytics"
  on public.profile_analytics for select to authenticated
  using (auth.uid() = profile_id);

create or replace function public.refresh_profile_analytics()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profile_analytics (
    profile_id, total_scans, safe_scans, suspicious_scans,
    dangerous_scans, unknown_scans, links_reviewed,
    average_trust_score, last_scanned_at, updated_at
  ) values (
    new.profile_id,
    1,
    case when new.verdict = 'safe' then 1 else 0 end,
    case when new.verdict = 'suspicious' then 1 else 0 end,
    case when new.verdict = 'dangerous' then 1 else 0 end,
    case when new.verdict = 'unknown' then 1 else 0 end,
    jsonb_array_length(new.links),
    new.trust_score,
    new.analyzed_at,
    now()
  )
  on conflict (profile_id) do update set
    total_scans = profile_analytics.total_scans + 1,
    safe_scans = profile_analytics.safe_scans + case when new.verdict = 'safe' then 1 else 0 end,
    suspicious_scans = profile_analytics.suspicious_scans + case when new.verdict = 'suspicious' then 1 else 0 end,
    dangerous_scans = profile_analytics.dangerous_scans + case when new.verdict = 'dangerous' then 1 else 0 end,
    unknown_scans = profile_analytics.unknown_scans + case when new.verdict = 'unknown' then 1 else 0 end,
    links_reviewed = profile_analytics.links_reviewed + jsonb_array_length(new.links),
    average_trust_score = ((profile_analytics.average_trust_score * profile_analytics.total_scans) + new.trust_score) / (profile_analytics.total_scans + 1),
    last_scanned_at = greatest(profile_analytics.last_scanned_at, new.analyzed_at),
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists mail_scans_refresh_analytics on public.mail_scans;
create trigger mail_scans_refresh_analytics
after insert on public.mail_scans
for each row execute function public.refresh_profile_analytics();
```

Consultas útiles para el dashboard:

```sql
-- Dominios más recibidos por un perfil
select sender_domain, count(*) as total
from public.mail_scans
where profile_id = auth.uid()
group by sender_domain
order by total desc
limit 10;

-- Remitentes más frecuentes
select sender_email, sender_display_name, count(*) as total
from public.mail_scans
where profile_id = auth.uid()
group by sender_email, sender_display_name
order by total desc
limit 10;
```

Si ya tienes datos previos, ejecuta el SQL antes de probar la sincronización. La inserción de la extensión usa `/api/scan/history` y `/api/scan/history/sync`; ambas rutas requieren un JWT válido de Supabase.

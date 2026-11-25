# Changelog

Todas las versiones de Mail Guard siguen [SemVer](https://semver.org/lang/es/):
`MAYOR.MENOR.PARCHE`. Cada versión se publica con un tag `vX.Y.Z`, que dispara
`.github/workflows/release.yml` (imagen en GHCR + GitHub Release con la
extensión).

## [2.5.2]

### Corregido

- **Dominios propios de una marca.** Un correo real de Supabase salía
  «Sospechoso» porque su enlace `supabase.help` se marcaba como «imita la
  dirección de una marca». Ahora, si el correo viene del dominio **oficial** de
  una marca, un enlace con exactamente su nombre (`supabase.help`,
  `status-supabase.com`) cuenta como de la misma organización.
  - Una variante con una letra distinta (`supabace.help`) sigue siendo
    imitación.
  - Desde un correo gratuito (gmail.com, outlook.com…) la regla no aplica: un
    enlace `google-verificacion.net` NO es de Google.
  - Jev necesita al menos 85 % de confianza para marcar como peligroso un enlace
    de la misma organización.
- `supabase.help` agregado a los dominios de Supabase. Caché `v4`.

## [2.5.1]

### Corregido

- **Palabras clave como palabras completas.** En producción, el aviso de
  Supabase mostraba «Habla de pagos o premios» porque «you won» (ganaste)
  coincidía dentro de «you won't be able». Ahora las palabras clave coinciden
  solo como palabras completas: aceptan plural, y `*` marca las raíces
  («sera bloquead*»).
- Un resultado «seguro» con una advertencia leve de contenido ya no dice «no te
  pide nada»: lo menciona con calma.

## [2.5.0]

### Mejorado

- **Veredictos más justos:**
  - Un aviso legítimo con plazo («tu proyecto se pausará») ya no sale
    sospechoso. La urgencia sola no es alerta; sí lo es junto con pedir datos o
    dinero, con una suplantación o con enlaces que llevan a otro sitio.
  - Un enlace solo se marca si Jev está razonablemente seguro (60 % para
    sospechoso, 50 % para peligroso) y no pertenece a la misma organización
    del remitente (`supabase.com` ↔ `supabase.link`).
  - Paso final de coherencia (`reconcileVerdict`): «sospechoso» exige al menos
    una alerta y «peligroso» al menos una falla. El puntaje queda en la franja
    de su veredicto, y las fallas objetivas de las reglas nunca quedan como
    «seguro».
  - La señal «Enlaces» se calcula con los enlaces finales: ya no dice «0 con
    alertas» mientras la lista muestra uno marcado.
  - Preguntas a Jev más precisas, con contexto de qué enlaces son del mismo
    remitente y una pregunta nueva sobre el tipo de correo (aviso, seguridad,
    facturación…).
  - Marcas nuevas: Supabase, GitHub, Vercel, Netlify, LinkedIn, Spotify,
    Discord, Dropbox, DocuSign, Airbnb, Nubank, Falabella y Rappi.
- **Textos para personas:** resumen, consejo, señales y enlaces en segunda
  persona y sin porcentajes ni jerga del modelo. Por ejemplo: «Parece un aviso
  legítimo de Supabase. Viene de supabase.com, una dirección oficial de
  Supabase, y sus enlaces llevan al mismo sitio…».
- Extensión: «Dominio no reconocido» en lugar de «sin verificar», y «Mejor no
  abras estos enlaces».
- Caché de análisis `v2`: los resultados con los textos anteriores dejan de
  servirse.

## [2.4.2]

### Corregido

- **«El servicio analysis se está iniciando» con los servicios encendidos.**
  Mientras Render despierta un servicio, responde errores rápidos en lugar de
  esperar. El gateway solo reintentaba unos 4,5 s, y despertar toma unos 20 s.
  - Ahora reintenta hasta ~22 s (7 intentos, esperas de 1,5 a 4 s), por debajo
    de los 30 s que esperan la extensión y el panel. El timeout del panel pasa
    de 15 a 30 s.
  - El gateway despierta a analysis e history al arrancar y los mantiene
    despiertos (`/health` cada 10 min) mientras está en uso. Así los tres duermen
    y despiertan juntos.

## [2.4.1]

### Corregido

- **Despertar servicios:** mientras analysis o history duermen en Render, las
  llamadas del gateway fallaban varios minutos sin despertarlos. `/api/status`
  del panel ahora llama además al `/health` directo de cada servicio, que los
  despierta en unos 20 s. La extensión despierta a través de esa ruta del panel.

## [2.4.0]

### Nuevo

- **Roles (`user` / `admin`)** sobre `profiles.role`
  ([`0007_roles.sql`](supabase/migrations/0007_roles.sql)):
  - **Para todos:** Resumen, Historial, Agentes IA (amenazas y alertas propias),
    Guía y Cuenta.
  - **Solo admins:** Usuarios, Entregables, Minería, Pruebas, el estado de
    servicios, y el ciclo, la bitácora y el botón del Centinela. Las páginas
    responden 404 a quien no es admin; los servicios responden 403.
- **Página Usuarios:** todas las personas registradas, con correo, rol,
  análisis, registro y último acceso. Tiene búsqueda, filtro por rol y botón
  «Hacer admin» / «Quitar admin». Nadie se puede quitar su propio rol.
- API: `GET /v1/admin/users` y `PATCH /v1/admin/users/:id`.

### Seguridad

- La política de `profiles` permitía que cada usuario actualizara su fila
  completa, incluido `role`: cualquiera podía volverse admin con la clave
  publicable. Ahora el rol `authenticated` solo puede escribir `display_name` y
  `avatar_url`; el rol lo cambia el history-service con la clave secreta,
  después de verificar que quien lo pide es admin.
- La bitácora del Centinela (`agent_runs`) solo la leen los admins.

### Corregido

- **Migración 0007:** funciona tanto si `profiles.role` es texto como si es un
  enum del proyecto (le agrega `user` y `admin`).

## [2.3.0]

### Nuevo

- **Despertar servicios:** indicador de estado en el panel (barra lateral; puntos
  en móvil) con botón «Despertar servicios». Reintenta hasta que gateway, análisis
  e historial respondan. Usa la nueva ruta `GET /api/status` del panel.
- **Despertar automático:** la portada despierta los servicios mientras la persona
  inicia sesión, y la extensión lo hace al abrir el popup.
- **Panel reorganizado:** navegación agrupada en _Protección_, _Proyecto de clase_
  y _Ayuda_. Nueva página **Entregables**, que reúne cada tema de la materia
  (agentes, minería, IA, pruebas, DevOps) con la lista de verificación de la
  entrega de agentes y los pasos para la demo.

### Corregido

- **CI:** el build del panel espera a `check-types` (`apps/extension-dashboard/turbo.json`).
  En paralelo, los dos escribían `.next/types` y el job fallaba a veces.

## [2.2.1]

### Corregido

- **Gateway:** durante el arranque en frío, Render también responde `429` (sin el
  JSON de la app) mientras despierta un servicio. El panel mostraba «El servicio
  history falló». Ahora ese 429 del proxy se reintenta igual que los 502/503/504;
  un 429 real de la aplicación (cuota diaria) se sigue propagando.
- **Analista:** el texto de la señal del Centinela habla de «la comunidad de Mail
  Guard» en lugar de «otros usuarios», porque los reportes pueden ser propios.

## [2.2.0]

### Nuevo

- **Agentes inteligentes** ([`docs/AGENTES.md`](docs/AGENTES.md)):
  - **Agente Analista** (reactivo basado en modelo, semiautomático): el análisis de
    siempre, que ahora consulta la base de conocimiento del Centinela. Un correo de
    un dominio en campaña activa muestra «Reportado por el agente Centinela».
  - **Agente Centinela** (deliberativo basado en objetivos, automático): en el
    history-service, corre cada 30 min, al arrancar y cuando llegan análisis
    riesgosos. Percibe conteos agregados por dominio, decide publicar, escalar,
    refrescar, retirar o descartar (con prioridad por utilidad), y avisa a los
    usuarios expuestos.
  - Página **Agentes** en el panel: tablas PEAS, último ciclo (percepción →
    deliberación → acción), base de conocimiento, alertas propias, bitácora y
    botón «Ejecutar Centinela».
  - API: `GET /v1/agents`, `POST /v1/agents/sentinel/run` y
    `POST /v1/agents/alerts/read`.
- **Migración** [`0006_agentes.sql`](supabase/migrations/0006_agentes.sql):
  tablas `threat_domains`, `agent_runs` y `agent_alerts`, con RLS, y funciones del
  sensor y del actuador, solo para `service_role`.
- **Configuración:** `SUPABASE_SECRET_KEY` y `SENTINEL_INTERVAL_MINUTES` en el
  history-service. Son opcionales: sin la clave, el Centinela queda desactivado.

## [2.1.3]

### Corregido

- **Gateway:** al abrir el panel con los servicios dormidos en Render aparecía
  «El servicio history falló». El proxy de Render responde 502/503 mientras
  cada servicio despierta, y el gateway no lo reintentaba. Ahora reintenta
  hasta 3 veces los 502/503/504 del proxy y los fallos de conexión; los errores
  reales de la aplicación, los 4xx y los timeouts se siguen propagando igual.
  Si el servicio sigue despertando, el mensaje es «se está iniciando».

## [2.1.2]

### Corregido

- **Despliegue:** Render asignó nuevas URLs a los Blueprints. El repo, la
  extensión y la documentación apuntan ahora a:
  - gateway: `https://mail-guard-gateway-zvze.onrender.com`
  - analysis: `https://mail-guard-analysis-96pk.onrender.com`
  - history: `https://mail-guard-history-bwiv.onrender.com`

  Se actualizaron `render.yaml`, `release.yml`, `scripts/ops-status.ts`,
  Prometheus, la colección de Postman, `RUNBOOK.md` y `DEVOPS.md`.

### Nuevo

- **Minería de datos:** página de minería con RapidMiner y Supabase, y su
  presentación.

## [2.1.1]

### Corregido

- **Extensión:** el zip de 2.1.0 se compiló sin `VITE_SUPABASE_URL` y fallaba
  al abrirse («supabaseUrl is required»). Ahora el repo tiene las variables de
  producción y `release.yml` se detiene si falta alguna, en vez de publicar una
  extensión rota.
- **Motor Jev:** `@typesafe-ai/sdk` se mantiene en 0.6; la 0.7.0 no funciona
  con Bun («Body already used») y dejaba el análisis siempre en el motor
  heurístico.

### Dependencias (Operate · Dependabot)

- 13 actualizaciones menores (Next 16.4, React 19.3, Supabase, Zod, Turborepo…).
- `@crxjs/vite-plugin` 3.0 y `@types/node` 26.
- Acciones de GitHub: `checkout` 7, `cache` 6, `upload-artifact` 7 y las de
  Docker (`build-push`, `login`, `metadata`, `setup-buildx`).
- ESLint 10 y TypeScript 7 quedan fuera hasta que `eslint-config-next` los
  soporte.

## [2.1.0]

### DevOps: las 8 fases del ciclo

- **Build / Test:** CI en GitHub Actions (`ci.yml`): tipos, lint, compilación,
  imagen Docker, pruebas de todos los workspaces y la colección de Postman
  contra los servicios reales.
- **Release:** `release.yml` publica la imagen en GHCR y crea el GitHub Release
  con la extensión empaquetada. `bun run release:version` sincroniza versiones.
- **Deploy:** Render despliega solo si el CI pasa (`autoDeployTrigger: checksPass`).
- **Operate:** healthchecks, reinicio automático y límites en Docker Compose;
  workflow `wake.yml` y `bun run ops:status`; `docs/RUNBOOK.md`.
- **Monitor:** endpoint `/metrics` (Prometheus) en los 3 microservicios,
  métrica `mailguard_scans_total` por veredicto, Prometheus + Grafana con
  dashboard y alertas (`docker-compose.monitoring.yml`).
- **Microservicios demo:** `microservicios-demo/` con dos microservicios
  (endpoint, validador y microservicio) que corren sin Docker.

## [2.0.0]

- Arquitectura de microservicios: gateway, analysis-service e history-service.
- Extensión para Gmail y Outlook y panel web.
- 128 pruebas: unitarias, API, seguridad y aceptación (Gherkin).

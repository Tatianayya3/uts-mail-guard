# Mail Guard en las 8 fases de DevOps

Cómo se aplica cada fase del ciclo DevOps en Mail Guard: **qué herramienta se
usó, cómo se instaló, cómo se configuró y cómo funciona**. Cada sección
termina con una demo de menos de 2 minutos para mostrar en vivo.

```
 PLAN ─▶ CODE ─▶ BUILD ─▶ TEST ─▶ RELEASE ─▶ DEPLOY ─▶ OPERATE ─▶ MONITOR
  │        │        └────┬───┘        │          │          │          │
GitHub   Git +     GitHub Actions   GitHub     Render    Docker     Prometheus
Projects GitHub    + Turborepo      Releases   Blueprint Compose +  + Grafana
+ Issues + PRs     + bun test       + GHCR     + Vercel  Render     + UptimeRobot
                   + Newman
```

| Fase                  | Herramientas                                            | Archivos clave                                                        |
| --------------------- | ------------------------------------------------------- | --------------------------------------------------------------------- |
| [Plan](#1-plan)       | GitHub Projects, GitHub Issues                          | `.github/ISSUE_TEMPLATE/`, `docs/USE_CASES.md`                        |
| [Code](#2-code)       | Git, GitHub (PRs + branch protection), ESLint, Prettier | `.github/pull_request_template.md`                                    |
| [Build](#3-build)     | GitHub Actions, Turborepo, Docker, Vite                 | `.github/workflows/ci.yml`, `turbo.json`, `Dockerfile`                |
| [Test](#4-test)       | bun test, Gherkin, Postman + Newman, GitHub Actions     | `.github/workflows/ci.yml`, `docs/postman/`, `*/test/`                |
| [Release](#5-release) | SemVer, GitHub Releases, GitHub Container Registry      | `.github/workflows/release.yml`, `CHANGELOG.md`                       |
| [Deploy](#6-deploy)   | Render (Blueprint), Vercel                              | `render.yaml`                                                         |
| [Operate](#7-operate) | Docker Compose, Render, GitHub Actions, Dependabot      | `docker-compose.yml`, `.github/workflows/wake.yml`, `docs/RUNBOOK.md` |
| [Monitor](#8-monitor) | Prometheus, Grafana, UptimeRobot                        | `monitoring/`, `docker-compose.monitoring.yml`                        |

**GitHub es una sola herramienta que cubre 5 fases:** Plan (Projects), Code
(repositorio y PRs), Build y Test (Actions) y Release (Releases + GHCR).

> Además, en [`microservicios-demo/`](../microservicios-demo/README.md) hay
> **dos microservicios como software, sin Docker**, cada uno con su script de
> endpoint, validador y microservicio.

---

## 1. Plan

**Herramientas:** GitHub Projects (tablero Kanban) + GitHub Issues.

**Instalación:** no se instala nada; viene con GitHub.
`Repositorio → Projects → New project → Board`.

**Configuración:**

- Columnas: _Por hacer → En progreso → En revisión → Hecho_.
- Plantillas de issues en `.github/ISSUE_TEMPLATE/`:
  - `feature.yml`: pide la **fase DevOps**, el objetivo y los criterios de aceptación.
  - `bug.yml`: componente, pasos para reproducirlo y `x-request-id`.
- El análisis funcional está en [`USE_CASES.md`](USE_CASES.md) (11 casos de uso)
  y [`ARCHITECTURE.md`](ARCHITECTURE.md).

**Cómo se aplica:** cada tarea es un issue con su fase. El PR que la resuelve
dice `Closes #N` y GitHub mueve la tarjeta a _Hecho_ al fusionarlo.

**Demo:** tablero del proyecto → abrir un issue → ver el PR enlazado y el commit.

---

## 2. Code

**Herramientas:** Git, GitHub, ESLint, Prettier, TypeScript estricto.

**Instalación:**

```bash
git clone https://github.com/Tatianayya3/uts-mail-guard.git
cd uts-mail-guard
bun install         # instala ESLint, Prettier, TypeScript y Turborepo
```

**Configuración:**

- Flujo **GitHub Flow**: rama por cambio (`feat/…`, `ci/…`, `docs/…`) → PR → revisión → merge a `main`.
- **Branch protection** en `main` (Settings → Branches): exige PR, 1 aprobación
  y que el CI esté en verde. Nadie puede subir directo a `main`.
- Plantilla de PR: `.github/pull_request_template.md` (fase y checklist).
- Estilo: `bun run format` (Prettier) y `bun run lint` (ESLint).

**Demo:** crear una rama, hacer un cambio, abrir el PR → la otra persona del
equipo lo revisa y lo aprueba → merge.

---

## 3. Build

**Herramientas:** GitHub Actions (servidor de CI), Turborepo (orquestador del
monorepo), Docker (imagen de los microservicios), Vite y Next.js.

**Instalación:**

- GitHub Actions: no se instala; basta con crear `.github/workflows/ci.yml`.
- Turborepo: dependencia del repo (`"turbo"` en `package.json`), se instala con `bun install`.
- Docker: Docker Desktop en local; en CI ya viene en el runner `ubuntu-latest`.

**Configuración:** `.github/workflows/ci.yml`, se ejecuta en cada push y PR a `main`.

| Job                                   | Qué hace                                                                                                            |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Build (tipos, lint y compilación)** | `bun install --frozen-lockfile` → `turbo run check-types lint build` → sube el `.zip` de la extensión como artifact |
| **Build (imagen Docker)**             | `docker build` de la imagen única de los microservicios (`Dockerfile`), con caché de capas                          |

- `turbo.json` define las tareas y sus dependencias (`build` depende de `^build`)
  y qué carpetas son salida (`dist/**`, `.next/**`) para la caché.
- La caché de Turborepo se guarda entre ejecuciones con `actions/cache`: si un
  paquete no cambió, su build se salta (aparece `cache hit` en el log).

**Cómo se aplica (local):**

```bash
bun run build                   # turbo run build en los 12 paquetes
docker build -t mail-guard .    # imagen de los microservicios
```

**Demo:** pestaña **Actions** → último run de _CI_ → abrir el job _Build_ → ver
los pasos y el artifact `extension-web` descargable.

---

## 4. Test

**Herramientas:** `bun test` (unitarias, API, seguridad y aceptación con
Gherkin), Postman + Newman (pruebas de API contra los servicios reales),
GitHub Actions (las ejecuta en cada cambio).

**Instalación:** `bun test` viene con Bun. Newman se ejecuta sin instalar con
`bunx newman@6.2.1`. Postman (opcional) para editar la colección.

**Configuración:**

| Tipo       | Dónde                                                           |
| ---------- | --------------------------------------------------------------- |
| Unitarias  | `services/*/test/*.test.ts`, `packages/*/test/`                 |
| API        | `services/gateway/test/api/`                                    |
| Seguridad  | `services/*/test/security/`                                     |
| Aceptación | `services/gateway/test/acceptance/features/*.feature` (Gherkin) |
| Postman    | `docs/postman/mail-guard.postman_collection.json`               |
| Demo       | `microservicios-demo/demo.test.ts`                              |

Jobs en `ci.yml`:

- **Test (unitarias, API, seguridad y aceptación):** `turbo run test` +
  `bun test microservicios-demo` + `bun run tests:report` (sube el reporte).
- **Test (Postman / Newman):** levanta los 3 microservicios de verdad, corre la
  colección y comprueba que `/metrics` responda.

**Cómo se aplica (local):**

```bash
bun run test           # todas las pruebas del monorepo
bun run test:demo      # pruebas de los microservicios demo
bun run test:postman   # Postman contra producción (o --env-var baseUrl=http://localhost:4000)
bun run tests:report   # regenera el reporte que muestra /dashboard/tests
```

**Demo:** abrir un PR que rompa una prueba → el check queda en rojo y GitHub
**bloquea el merge**. Luego mostrar `/dashboard/tests` en el panel web.

---

## 5. Release

**Herramientas:** versionado semántico (SemVer), GitHub Releases, GitHub
Container Registry (GHCR), GitHub Actions.

**Instalación:** nada; GHCR y Releases vienen con GitHub. El workflow usa el
`GITHUB_TOKEN` automático (no hay secretos que configurar).

**Configuración:**

- `scripts/bump-version.ts` (`bun run release:version X.Y.Z`): pone la misma
  versión en todos los paquetes y actualiza `bun.lock`.
- `CHANGELOG.md`: una sección `## [X.Y.Z]` por versión.
- `.github/workflows/release.yml`, se dispara con un tag `vX.Y.Z`:
  1. Vuelve a correr el CI completo sobre ese commit.
  2. Publica la imagen en `ghcr.io/<dueño>/uts-mail-guard` con las etiquetas `X.Y.Z`, `X.Y` y `latest`.
  3. Verifica que el tag coincida con la versión del código.
  4. Compila la extensión de producción y crea el **GitHub Release** con el
     `.zip`, la sección del CHANGELOG y las notas automáticas (agrupadas según
     `.github/release.yml`).

**Cómo se aplica:**

```bash
bun run release:version 2.2.0
# editar CHANGELOG.md
git commit -am "release: v2.2.0"
git tag v2.2.0
git push --follow-tags
```

**Demo:** pestaña **Releases** → versión con el `mail-guard-x.y.z.zip`
descargable → pestaña **Packages** → imagen Docker con sus etiquetas
(`docker pull ghcr.io/…:2.1.0`).

---

## 6. Deploy

**Herramientas:** Render (microservicios, como _Blueprint_: infraestructura
como código), Vercel (panel web), Supabase (base de datos).

**Instalación / configuración inicial (una vez):**

| Componente           | Servicio                                        | Plan gratuito                                     |
| -------------------- | ----------------------------------------------- | ------------------------------------------------- |
| 3 microservicios     | **Render** (Blueprint `render.yaml`)            | Web services free; se duermen tras 15 min sin uso |
| Panel web            | **Vercel** Hobby                                | Uso personal / no comercial                       |
| Auth + base de datos | **Supabase** Free                               | Proyecto pausado tras 7 días sin actividad        |
| Cuota y caché        | Memoria del servicio (Upstash Free es opcional) | —                                                 |

1. **Supabase:** crea el proyecto y ejecuta las migraciones `0001` y `0002` de `supabase/migrations/`.
2. **Render:** _New → Blueprint_ → elige este repositorio. Render lee `render.yaml`, crea
   `mail-guard-gateway`, `mail-guard-analysis` y `mail-guard-history`, genera el
   `INTERNAL_SERVICE_TOKEN` compartido y te pide `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`
   y (opcional) `TYPESAFE_API_KEY`. Si Render asigna URLs distintas a
   `https://mail-guard-*.onrender.com`, corrígelas en las variables del gateway.
3. **Vercel:** importa el repo con _Root Directory_ `apps/extension-dashboard` y define
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` y
   `API_GATEWAY_URL=https://mail-guard-gateway.onrender.com`.
4. **Extensión:** en `apps/extension-web/.env` pon `VITE_API_GATEWAY_URL` (Render) y
   `VITE_DASHBOARD_URL` (Vercel), luego `bun run build` y recarga `dist/` en Chrome.
   (O descarga el `.zip` del último GitHub Release.)
5. **Supabase → Authentication → URL Configuration:** agrega
   `https://<tu-panel>.vercel.app/reset-password`.

**Despliegue continuo:** en `render.yaml` cada servicio tiene
`autoDeployTrigger: checksPass`. El flujo completo es:

```
merge a main ─▶ GitHub Actions (CI) ─▶ ¿todos los checks en verde?
                                         ├─ sí ─▶ Render construye el Dockerfile y despliega
                                         └─ no ─▶ no se despliega nada
```

Render hace el despliegue sin cortes: la versión nueva solo recibe tráfico
cuando su `healthCheckPath: /health` responde 200.

**Producción real (no gratis):**

| Componente     | Recomendación                                                                                                  |
| -------------- | -------------------------------------------------------------------------------------------------------------- |
| Microservicios | Plan pago de Render, Railway o Fly.io con el mismo `Dockerfile` (`SERVICE=<servicio>`). Expón solo el gateway. |
| Cuota y caché  | **Upstash Redis** cuando haya más de una instancia.                                                            |
| Extensión      | Sube el `.zip` del GitHub Release a la Chrome Web Store.                                                       |

Antes de publicar: define `CORS_ORIGINS=chrome-extension://<ID>,https://<tu-panel>` y un
`INTERNAL_SERVICE_TOKEN` largo y aleatorio en los tres servicios.

**Demo:** merge de un PR → CI verde → Render Dashboard → _Events_ muestra el
deploy disparado por el commit → abrir
`https://mail-guard-gateway.onrender.com/health/services`.

---

## 7. Operate

**Herramientas:** Docker Compose (operación local), Render Dashboard (logs,
reinicios, rollback, variables), GitHub Actions (`wake.yml`), Dependabot.

**Instalación:** Docker Desktop. Render y Dependabot vienen con sus plataformas.

**Configuración:**

- `docker-compose.yml`:
  - `restart: unless-stopped`: si un contenedor muere, Docker lo levanta de nuevo.
  - `healthcheck` contra `/health` cada 15 s (`docker compose ps` muestra `healthy`).
  - `depends_on: condition: service_healthy`: el gateway espera a que análisis e historial estén sanos.
  - Límites de **0.5 CPU / 256 MB** por servicio y rotación de logs (10 MB × 3).
- `.github/workflows/wake.yml`: botón _Run workflow_ que despierta los servicios
  de Render y deja una tabla de estado en el resumen del run.
- `scripts/ops-status.ts` (`bun run ops:status`): lo mismo desde la terminal.
- `.github/dependabot.yml`: PRs semanales para actualizar dependencias, Docker y Actions.
- Procedimientos de operación: [`RUNBOOK.md`](RUNBOOK.md).

**Cómo se aplica:**

```bash
bun run ops:status                 # estado de producción (despierta Render)
docker compose up --build -d       # levantar en local
docker compose ps                  # estado y salud de cada contenedor
docker compose logs -f gateway     # logs JSON con request-id
docker compose restart analysis-service
```

**Demo:** `docker compose up -d` → `docker kill` del analysis-service → a los
pocos segundos `docker compose ps` lo muestra levantado y `healthy` otra vez.
Luego Actions → _Operate · Estado de producción_ → _Run workflow_.

---

## 8. Monitor

**Herramientas:** Prometheus (recolecta métricas y evalúa alertas), Grafana
(dashboards), UptimeRobot (disponibilidad de producción desde internet).

**Instalación:** con Docker, sin instalar nada más:

```bash
bun run monitoring:up        # servicios + Prometheus + Grafana (local)
bun run monitoring:render    # además, monitorea producción en Render
bun run monitoring:down
```

| URL                           | Qué hay                                                         |
| ----------------------------- | --------------------------------------------------------------- |
| http://localhost:3001         | Grafana → dashboard _Mail Guard · Microservicios_ (admin/admin) |
| http://localhost:9090         | Prometheus → _Status → Targets_, _Alerts_, consultas PromQL     |
| http://localhost:4000/metrics | Métricas crudas del gateway                                     |

**Configuración:**

1. **Instrumentación del código.** `packages/service-kit/src/metrics.ts` crea
   un registro de [prom-client](https://github.com/siimon/prom-client) por
   servicio, y `createServiceApp` lo publica en `GET /metrics`, así que los 3
   servicios lo heredan:
   - `http_requests_total{method, route, status, service}`
   - `http_request_duration_seconds` (histograma de latencia)
   - métricas del proceso: CPU, memoria, event loop
   - `mailguard_scans_total{verdict, cached}` (gateway): correos analizados por veredicto.
   - Opcional: `METRICS_TOKEN` exige `Authorization: Bearer <token>` en `/metrics`.
2. **Prometheus** (`monitoring/prometheus/prometheus.yml`): lee `/metrics` de
   los 3 servicios cada 15 s. `prometheus.render.yml` agrega producción.
3. **Alertas** (`monitoring/prometheus/alerts.yml`): `ServicioCaido`,
   `ErroresAltos` (>5 % de 5xx), `LatenciaAlta` (p95 > 3 s) y `PicoDePhishing`.
4. **Grafana** (`monitoring/grafana/`): el datasource y el dashboard se cargan
   solos al arrancar (_provisioning_). Paneles: estado por servicio, peticiones/s,
   latencia p95, % de errores, respuestas por código, memoria y donut de veredictos.
5. **UptimeRobot** (producción): revisa desde internet, cada 5 minutos, que los
   3 microservicios de Render respondan, y avisa por correo si alguno cae.
   Configuración (plan gratuito, en [uptimerobot.com](https://uptimerobot.com)):
   1. _Add New Monitor_ → tipo **Keyword**, nombre `Mail Guard · producción`.
   2. URL: `https://mail-guard-gateway.onrender.com/health/services`.
   3. Keyword `"down"` con **Alert when: keyword exists**: el gateway responde
      `{"analysis":"down"}` si un servicio interno no contesta, así la alerta
      cubre los 3 servicios con un solo monitor.
   4. Intervalo 5 min; contacto de alerta: el correo del equipo.
   5. _Status Pages_ → nueva página pública con ese monitor (para mostrarla en la demo).

   Mientras esté activo, los servicios free de Render no se duermen y gastan
   horas del plan (750 h al mes por cuenta). Se deja **en pausa** y se reanuda
   la semana de la evaluación: _Monitor → Pause / Resume_.

**Demo:** `bun run monitoring:up` → abrir Grafana → generar tráfico con
`bunx newman@6.2.1 run docs/postman/mail-guard.postman_collection.json --env-var baseUrl=http://localhost:4000 -n 20`
→ las gráficas suben y el donut cuenta los correos `dangerous` → `docker stop`
de un servicio → su panel pasa a **CAÍDO** y la alerta `ServicioCaido` se activa
en Prometheus → _Alerts_.

---

## Microservicios como software (evaluación)

En [`microservicios-demo/`](../microservicios-demo/README.md) hay dos
microservicios **sin Docker y sin dependencias**: `Analizador` (`:5001`) e
`Historial` (`:5002`). Cada uno tiene `endpoint.ts`, `validador.ts` y
`microservicio.ts`. El Analizador llama al Historial por HTTP.

```bash
bun run demo:historial      # terminal 1
bun run demo:analizador     # terminal 2
# peticiones listas en microservicios-demo/demo.http
```

El sistema real aplica el mismo patrón en `services/` (Bun + Hono, validación
con Zod en `packages/contracts`).

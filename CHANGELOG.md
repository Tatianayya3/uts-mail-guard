# Changelog

Todas las versiones de Mail Guard siguen [SemVer](https://semver.org/lang/es/):
`MAYOR.MENOR.PARCHE`. Cada versión se publica con un tag `vX.Y.Z`, que dispara
`.github/workflows/release.yml` (imagen en GHCR + GitHub Release con la
extensión).

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

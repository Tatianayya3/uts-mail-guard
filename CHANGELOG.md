# Changelog

Todas las versiones de Mail Guard siguen [SemVer](https://semver.org/lang/es/):
`MAYOR.MENOR.PARCHE`. Cada versión se publica con un tag `vX.Y.Z`, que dispara
`.github/workflows/release.yml` (imagen en GHCR + GitHub Release con la
extensión).

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

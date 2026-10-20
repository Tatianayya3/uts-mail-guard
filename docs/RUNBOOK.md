# Runbook de operación

Procedimientos para operar Mail Guard en producción (Render + Vercel +
Supabase) y en local (Docker Compose). Fase **Operate** de
[`DEVOPS.md`](DEVOPS.md).

## Servicios

| Servicio         | Producción                               | Local (Docker)   | Salud                         |
| ---------------- | ---------------------------------------- | ---------------- | ----------------------------- |
| gateway          | https://mail-guard-gateway.onrender.com  | `localhost:4000` | `/health`, `/health/services` |
| analysis-service | https://mail-guard-analysis.onrender.com | red interna      | `/health`                     |
| history-service  | https://mail-guard-history.onrender.com  | red interna      | `/health`                     |
| Panel web        | Vercel                                   | `localhost:3000` | —                             |

Todos exponen `/metrics` (Prometheus) y escriben logs JSON de una línea con
`requestId`, `method`, `path`, `status` y `ms`.

---

## Antes de una demo

Los servicios free de Render se duermen tras 15 min sin tráfico y tardan
unos 30-60 s en despertar.

1. GitHub → **Actions → Operate · Estado de producción → Run workflow**, o
   en la terminal: `bun run ops:status`.
2. Espera a que los tres digan `ok`. El resumen del run muestra la tabla.
3. Si vas a mostrar monitoreo de producción: `bun run monitoring:render`.
4. La semana de la evaluación, reanuda el monitor de UptimeRobot
   (_Monitor → Resume_): mantiene despiertos los servicios y avisa si caen.
   Después, ponlo en pausa para no gastar las horas gratis de Render.

## Un servicio está caído

1. `bun run ops:status`: ¿cuál falla?
2. Render → servicio → **Logs**. Busca `"level":"error"` o `unhandled_error`.
3. Render → **Events**: ¿falló el último deploy? Si sí, ve a _Rollback_.
4. Si solo se colgó: Render → **Manual Deploy → Restart service**.
5. En local: `docker compose ps` → `docker compose restart <servicio>`.

## Rollback

- **Render:** servicio → _Events_ → deploy anterior que funcionaba →
  **Rollback**. Para que el siguiente merge no lo pise, revierte también el
  commit: `git revert <sha> && git push`.
- **Imagen Docker:** cada release está en GHCR con su versión:
  `docker pull ghcr.io/<dueño>/uts-mail-guard:2.0.0`.

## Rastrear un error de un usuario

Cada respuesta del gateway trae la cabecera `x-request-id`, y la misma se
propaga a analysis e history. Búscala en los logs de los tres servicios en
Render (o `docker compose logs | grep <id>`).

## Rotar el `INTERNAL_SERVICE_TOKEN`

1. Render → **Environment Groups → mail-guard-internal** → edita
   `INTERNAL_SERVICE_TOKEN` (un valor largo y aleatorio).
2. Render redespliega los 3 servicios que usan el grupo. Durante el reinicio,
   las llamadas internas pueden responder 401 algunos segundos.
3. En local: cambia la variable en los tres `.env` y `docker compose up -d`.

## Escalar

- Plan free: 1 instancia por servicio. En un plan pago: Render → _Scaling_
  (manual o autoescalado por CPU/memoria).
- Con más de una instancia del gateway o del análisis, configura
  `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN` para compartir cuota y caché.

## Dependencias

Dependabot abre PRs cada lunes (`.github/dependabot.yml`). Solo se fusionan si
el CI pasa. Si un PR de Dependabot rompe el CI, ciérralo y abre un issue.

## Alertas (Prometheus)

| Alerta           | Qué significa                          | Qué hacer                                          |
| ---------------- | -------------------------------------- | -------------------------------------------------- |
| `ServicioCaido`  | No se puede leer `/metrics` hace 1 min | Sección _Un servicio está caído_                   |
| `ErroresAltos`   | Más del 5 % de respuestas 5xx          | Logs del servicio; ¿falló Supabase o Jev?          |
| `LatenciaAlta`   | p95 por encima de 3 s                  | ¿Jev/LLM lento? Probar `DECISION_ENGINE=heuristic` |
| `PicoDePhishing` | Más de 10 correos peligrosos en 15 min | Informativa: posible campaña de phishing           |

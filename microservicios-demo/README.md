# Microservicios como software (sin Docker)

Dos microservicios escritos en TypeScript que se ejecutan directamente con
[Bun](https://bun.sh), sin contenedores ni librerías externas. Cada uno tiene
sus tres scripts separados:

| Script             | Analizador (`:5001`)                               | Historial (`:5002`)                                |
| ------------------ | -------------------------------------------------- | -------------------------------------------------- |
| `endpoint.ts`      | `GET /health`, `POST /analizar`                    | `GET /health`, `POST /historial`, `GET /historial` |
| `validador.ts`     | Remitente válido, asunto texto, cuerpo obligatorio | Remitente, veredicto permitido, puntaje 0-100      |
| `microservicio.ts` | Servidor HTTP + cliente hacia Historial            | Servidor HTTP                                      |

```
Cliente ──POST /analizar──▶ Analizador ──POST /historial──▶ Historial
                              │ validador                     │ validador
                              │ reglas de riesgo              │ memoria
```

El Analizador valida el correo, calcula un puntaje de riesgo (0-100) y le
envía el resultado al Historial por HTTP. Si el Historial está caído, el
análisis se entrega igual con `guardado: false`.

## Ejecutar

Desde la raíz del repositorio, en dos terminales:

```bash
bun run demo:historial    # = bun microservicios-demo/historial/microservicio.ts
bun run demo:analizador   # = bun microservicios-demo/analizador/microservicio.ts
```

Luego usa las peticiones de [`demo.http`](./demo.http), o con curl:

```bash
curl -X POST http://localhost:5001/analizar -H "Content-Type: application/json" \
  -d '{"remitente":"soporte-banco@gmail.com","asunto":"URGENTE","cuerpo":"Verifica tu contraseña http://192.168.4.20"}'
curl http://localhost:5002/historial
```

## Pruebas

```bash
bun test microservicios-demo
```

Prueban cada validador, cada endpoint y los dos servicios conectados por HTTP.

## Relación con Mail Guard

El sistema real (`services/`) sigue el mismo patrón, separado en capas:

| Pieza         | Demo                          | Mail Guard                                                      |
| ------------- | ----------------------------- | --------------------------------------------------------------- |
| Endpoint      | `analizador/endpoint.ts`      | `services/analysis-service/src/http/routes.ts`                  |
| Validador     | `analizador/validador.ts`     | `packages/contracts/src/scan.ts` (Zod) + `requireInternalToken` |
| Microservicio | `analizador/microservicio.ts` | `services/analysis-service/src/index.ts` (Bun + Hono)           |

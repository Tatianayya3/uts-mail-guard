# Imagen única para los tres microservicios. El servicio se elige con la
# variable SERVICE (gateway | analysis-service | history-service), ya sea
# como build-arg o como variable de entorno en tiempo de ejecución:
#   docker build -t mail-guard .
#   docker run -e SERVICE=gateway -p 4000:4000 mail-guard
FROM oven/bun:1.4-alpine AS install
WORKDIR /app
COPY package.json bun.lock ./
COPY packages ./packages
COPY services ./services
# Las apps no se ejecutan aquí, pero bun necesita sus manifiestos del workspace.
COPY apps/extension-dashboard/package.json apps/extension-dashboard/package.json
COPY apps/extension-web/package.json apps/extension-web/package.json
RUN bun install --frozen-lockfile --production --ignore-scripts

FROM oven/bun:1.4-alpine AS runtime
WORKDIR /app
ARG SERVICE=gateway
ENV NODE_ENV=production SERVICE=${SERVICE}
COPY --from=install /app /app
USER bun
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- "http://127.0.0.1:${PORT:-4000}/health" || exit 1
CMD ["sh", "-c", "cd services/$SERVICE && exec bun src/index.ts"]

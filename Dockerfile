# Imagen única para los microservicios. Uso:
#   docker build --build-arg SERVICE=gateway -t mail-guard-gateway .
FROM oven/bun:1.4-alpine AS base
WORKDIR /app

FROM base AS install
COPY package.json bun.lock ./
COPY packages ./packages
COPY services ./services
# Las apps no se construyen aquí, pero bun necesita sus manifiestos.
COPY apps/extension-dashboard/package.json apps/extension-dashboard/package.json
COPY apps/extension-web/package.json apps/extension-web/package.json
RUN bun install --frozen-lockfile --production --ignore-scripts

FROM base AS runtime
ARG SERVICE
ENV NODE_ENV=production SERVICE=${SERVICE}
COPY --from=install /app /app
USER bun
WORKDIR /app/services/${SERVICE}
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:${PORT:-4000}/health || exit 1
CMD ["bun", "src/index.ts"]

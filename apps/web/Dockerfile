# Tienda de Mini Galú para producción (deploy/docker-compose.yml en Lightsail, o cualquier host de contenedores).
# Se construye desde la raíz del monorepo:  docker build -f apps/web/Dockerfile -t mini-galu-web .
# Las NEXT_PUBLIC_* quedan grabadas en el build: si cambian, hay que volver a construir.

FROM node:24-slim AS build
ENV HUSKY=0 CI=true NEXT_TELEMETRY_DISABLED=1 NEXT_STANDALONE=1
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_MEDIA_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_MEDIA_URL=$NEXT_PUBLIC_MEDIA_URL
RUN npm install -g pnpm@12.9.1
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile --filter @mini-galu/web... \
 && pnpm --filter @mini-galu/web build \
 && cp -r apps/web/public apps/web/.next/standalone/apps/web/ \
 && cp -r apps/web/.next/static apps/web/.next/standalone/apps/web/.next/

FROM node:24-slim
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=build --chown=node:node /repo/apps/web/.next/standalone ./
USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]

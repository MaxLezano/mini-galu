# API de Mini Galú para producción (Render, Fly o cualquier host de contenedores).
# Se construye desde la raíz del monorepo:  docker build -f apps/api/Dockerfile -t mini-galu-api .
# Al arrancar aplica las migraciones y levanta la API (node dist/main.js).

FROM node:24-slim AS build
ENV HUSKY=0 CI=true
RUN npm install -g pnpm@12.9.1
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile --filter @mini-galu/api... \
 && pnpm --filter @mini-galu/api build \
 && node -p "require('./apps/api/package.json').dependencies.sharp" > /sharp-version

FROM node:24-slim
ENV NODE_ENV=production
WORKDIR /app
# el bundle trae todo adentro menos sharp, que es nativo y se instala para esta plataforma
COPY --from=build /sharp-version /tmp/sharp-version
RUN echo '{"type":"module"}' > package.json \
 && npm install --omit=dev --no-audit --no-fund "sharp@$(cat /tmp/sharp-version)" \
 && npm cache clean --force
COPY --from=build /repo/apps/api/dist ./dist
USER node
EXPOSE 4000
CMD ["sh", "-c", "node dist/migrate.js && exec node --enable-source-maps dist/main.js"]

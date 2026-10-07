# 0001 · Monorepo TypeScript con módulos hexagonales

- **Estado:** aceptada (fase 1)
- **Contexto:** el proyecto viejo eran dos repos (Flask + React) sin contrato compartido, con precios en `float` y SQLite.
- **Decisión:** monorepo pnpm + Turborepo. `apps/web` (Next.js) y `apps/api` (Hono) hablan con los schemas zod de
  `packages/contracts`. La API se organiza por módulos de negocio (Screaming Architecture: `catalog/`, `orders/`, …) y cada
  módulo en capas `domain` → `application` (casos de uso + puertos) → `infrastructure` (Drizzle, HTTP, adapters).
  El único lugar que elige adapters es `apps/api/src/app.ts` (composition root). Precios siempre en centavos (`int`).
- **Consecuencias:** un solo lenguaje y tipos de punta a punta; el dominio se testea sin base de datos (repos en memoria);
  cambiar Mercado Pago, Andreani o el LLM es escribir otro adapter.

# Mini Galú

Tienda, catálogo y sistema de pedidos automatizado para **prendas de diseño para niñas** (12 meses a talle 10).
Diseños propios, bordados a mano, producción fotográfica propia.

Estética *"Atelier de cuento"*: vintage-campestre, romántica, con detalles de costura. Todo corre local y gratis primero.

| | |
|---|---|
| Plan y arquitectura | [docs/PLAN.md](docs/PLAN.md) |
| Estado de cada feature | [docs/ROADMAP.md](docs/ROADMAP.md) |
| Mockups (fase 0) | [design/mockups](design/mockups/README.md) |
| Ideas y decisiones | [docs/IDEAS.md](docs/IDEAS.md) · [docs/adr](docs/adr) |
| Cómo contribuir | [CONTRIBUTING.md](CONTRIBUTING.md) |

## Stack

pnpm + Turborepo · **Next.js 16** (tienda y panel) · **Hono** (API) · **PostgreSQL 17 + pgvector** · **Drizzle** ·
zod · Tailwind v4 + tokens propios · Swiper · Lucide · Vitest · Playwright · Biome.

```
apps/
  web/        Next.js — tienda (app/(shop)) y panel del taller (app/taller)
  api/        Hono — módulos catalog/, content/ … (domain · application · infrastructure)
packages/
  contracts/  schemas zod compartidos web ↔ api
  db/         schema Drizzle, migraciones y seed (productos reales)
  design-tokens/  paleta, tipografías, forma y movimiento (1:1 con los mockups)
  config/     tsconfig base
design/mockups/   HTML estático aprobado (referencia visual y de comportamiento)
docs/             plan, roadmap, ideas y ADRs
local-assets/     (ignorada) fotos de prueba y export del proyecto viejo — ver local-assets/README.md
```

## Arrancar

Requisitos: **Node 24**, **pnpm 12** (`npm i -g pnpm`), **Docker**.

```bash
pnpm install
cp .env.example .env        # en Windows: copy .env.example .env
pnpm db:up                  # Postgres en :5433 y Mailpit en :8025
pnpm db:reset               # migraciones + seed (11 productos, colecciones y el lanzamiento)
                            # las fotos de prueba salen de local-assets/ (no está en git; sin ella, productos sin foto)
pnpm dev                    # web http://localhost:3000 · api http://localhost:4000
```

Panel del taller: http://localhost:3000/taller — en local entra con `gaby@minigalu.com.ar` / `taller-mini-galu`
(o lo que pongas en `ADMIN_EMAIL` / `ADMIN_PASSWORD` del `.env` antes de `pnpm db:seed`).

Mockups: `pnpm mockups` → http://localhost:5500

## Scripts

| Comando | Qué hace |
|---|---|
| `pnpm dev` | web + api con recarga |
| `pnpm build` | build de producción |
| `pnpm lint` / `pnpm lint:fix` | Biome |
| `pnpm typecheck` | TypeScript en todos los paquetes |
| `pnpm test` | Vitest (dominio, contratos, lógica de la web) |
| `pnpm test:e2e` | Playwright en celular y escritorio |
| `pnpm shots <url> <nombre> [anchos]` | capturas 375/820/1440/2560 para comparar con los mockups |
| `pnpm db:generate` | nueva migración desde el schema |
| `pnpm db:migrate` / `db:seed` / `db:reset` / `db:studio` | base de datos |

## API (fase 2)

| Método | Ruta | |
|---|---|---|
| GET | `/catalog/products?col&talle&ocasion&color&max&instock&q&sort` | catálogo filtrado |
| GET | `/catalog/products/:slug` | ficha con reseñas y "completá el look" |
| GET | `/catalog/facets` | colecciones con cantidad, colores, rango de precios |
| POST | `/catalog/waitlist` | avisame cuando vuelva (talle) / cuando salga (borrador) |
| GET | `/content/home` | portada, lanzamiento, lookbook, reseñas, Instagram |
| POST | `/content/launches/:id/signups` | anotarse al lanzamiento |
| GET | `/media/*` | imágenes (ImageStorage local) |
| POST | `/auth/sign-in/email` · `/auth/sign-out` · GET `/auth/get-session` | sesión del panel (Better Auth) |
| GET/POST | `/admin/catalog/products` | panel: listado con lista de espera / crear (requiere sesión admin) |
| GET/PUT | `/admin/catalog/products/:slug` | panel: ver / guardar (avisa talles que vuelven) |
| PATCH | `/admin/catalog/products/:slug/status` | panel: publicar u ocultar |
| POST | `/admin/catalog/images` | panel: subir foto (multipart `file`, máx. 8 MB) |

## Estado

Fase 1 (base) ✅ · Fase 2 (catálogo) en curso: tienda lista y panel de productos con login; faltan lanzamientos y
portada en el panel. Detalle en [docs/ROADMAP.md](docs/ROADMAP.md).

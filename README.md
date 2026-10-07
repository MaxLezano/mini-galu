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

Panel del taller: http://localhost:3000/taller — en local entra con `gaby@minigalu.com.ar` / `Taller.MiniGalu1`
(o lo que pongas en `ADMIN_EMAIL` / `ADMIN_PASSWORD` del `.env` antes de `pnpm db:seed`).

Mockups: `pnpm mockups` → http://localhost:5500

### Pagos (Mercado Pago)

Sin credenciales, el checkout usa un **gateway simulado** (no cobra nada). Como las tarjetas de prueba de Mercado Pago,
el nombre del titular decide el resultado: `APRO` aprueba, `OTHE` rechaza, `CONT` queda en revisión, `FUND` sin saldo.

Para probar con Mercado Pago de verdad (modo prueba), en el `.env`:

```bash
MP_ACCESS_TOKEN=APP_USR-…      # credenciales de prueba de la cuenta vendedora de prueba
MP_PUBLIC_KEY=APP_USR-…
MP_WEBHOOK_SECRET=…            # "Webhooks" → clave secreta, en el panel de developers de Mercado Pago
MP_MODE=prueba                 # o produccion
```

El webhook (`/payments/webhook`) necesita una URL pública https: `cloudflared tunnel --url http://localhost:4000` y
`PUBLIC_API_URL` con esa URL. Sin túnel igual funciona: al volver de Mercado Pago la web confirma el pago consultándolo.

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

## API

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
| GET | `/cart` · POST/PUT `/cart/items` · POST `/cart/merge` | bolsa (cookie de invitada `mg_cart` o cuenta) |
| GET | `/checkout/config` · `/checkout/shipping?cp=` | medios de pago activos · opciones de envío y franjas de retiro |
| POST | `/checkout/quote` | subtotal, cupón, envío y total |
| POST | `/checkout/orders` | crea el pedido y reserva el stock 30 min |
| GET | `/checkout/orders/:numero?t=` | comprobante (número + token) |
| POST | `/checkout/orders/:numero/pay` · `/wallet` · `/sync` | tarjeta (token del Brick) · dinero en cuenta · confirmar la vuelta |
| POST | `/payments/webhook` | avisos de Mercado Pago (firma `x-signature`) |
| GET/PUT | `/admin/payments` | panel: medios de pago y cuotas sin interés |
| GET/POST/PUT/PATCH/DELETE | `/admin/coupons` | panel: cupones |

## Estado

Fase 1 (base) ✅ · Fase 2 (catálogo) ✅ · Fase 3 (checkout) ✅ con gateway simulado; falta la prueba en el sandbox
de Mercado Pago con credenciales. Detalle en [docs/ROADMAP.md](docs/ROADMAP.md).

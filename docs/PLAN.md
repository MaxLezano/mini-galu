# Mini Galú — Plan de estructura e implementación

> Tienda, catálogo y **sistema de pedidos automatizado** para prendas de diseño para niñas (12 meses a talle 10).
> Diseños propios, bordados a mano, producción fotográfica propia.
> Todo corre **local y gratis** primero. Deploy recién cuando esté probado.

Ideas y recomendaciones de la Fase 0: [IDEAS.md](IDEAS.md) · Mockups: [design/mockups](../design/mockups/README.md) ·
Estado de cada feature: [ROADMAP.md](ROADMAP.md) · Decisiones: [adr/](adr/)

---

## 1. Qué aprendimos del proyecto viejo (solo como guía)

| Viejo | Problema | Nuevo |
|---|---|---|
| 2 repos (Flask + React/Vite) | Dos lenguajes, tipos duplicados, sin contrato compartido | **Monorepo TypeScript** con contratos compartidos (zod) |
| SQLite + `float` para precios | Redondeos, sin migraciones reales | **PostgreSQL** + Drizzle migrations, precios en **centavos (int)** |
| `Product` + `ProductVariant(size, stock)` | Bien pensado, se mantiene | Se mantiene y se agregan color, colección, medidas y lista de espera por talle |
| `SiteConfig` con JSON para el home | Sirve | Se mantiene como módulo `content` (portada, lanzamientos, anuncios) |
| Carrito y favoritos solo logueado | Fricción | Bolsa de invitada (cookie) + merge al loguear |
| Sin pedidos, pagos ni envíos | — | Módulos `orders`, `payments`, `shipping`, `notifications` |
| Admin = ABM de productos | No sirve para operar | **Panel del taller**: tablero de pedidos, qué coser, clientas, automatizaciones |

Datos reales exportados (10 productos, sin el de prueba) + fotos y portada vieja: quedan **fuera del repo** en
`local-assets/legacy/` (carpeta ignorada; las imágenes de contenido se cargan desde el panel en producción).
El seed curado vive en `packages/db/src/seed/data.ts`. El proyecto viejo ya fue borrado (ver §9).

---

## 2. Identidad visual (resumen — detalle en los mockups)

Estética **vintage-campestre, romántica** (lino, pana, plumeti, puntilla, bordado, moños), no "pastel infantil genérico".

- **Concepto:** *"Atelier de cuento"* — editorial, con detalles de costura.
- **Paleta (única fuente de color, sin azules ni colores de marcas):** papel `#FBF8F3`, lino `#F4EDE3`, cacao `#3A2A22`,
  canela `#B0643E`, salvia `#8B9A7C`, rosa empolvado `#E8C6BF`, rojo romántico `#A3302B` (acento puntual).
  Los logos de Mercado Pago, WhatsApp, Instagram y Google se usan **monocromos** en el color del texto.
- **Tipografía:** *Fraunces* (display) + *Manrope* (UI) + *Caveat* (notas a mano).
- **Íconos:** Lucide (trazo 1.6) + logos de marca de Simple Icons. **Sin íconos de "IA"** (destellos/sparkles).
- **Firma:** puntadas (bordes punteados), festón, arcos, moño, etiquetas de prenda.
- **Movimiento:** View Transitions entre páginas, reveal al scrollear, carruseles Swiper, `prefers-reduced-motion` respetado.
- **Responsive verificado:** 375 px (celular), 820 px (tablet), 1440 px (escritorio) y 2560 px (ultrawide).

---

## 3. Stack (todo gratis / open source)

| Capa | Elección | Por qué |
|---|---|---|
| Monorepo | **pnpm workspaces + Turborepo** | Cache de builds, scripts unificados |
| Web (tienda + panel) | **Next.js (App Router) + React + TypeScript** | SSR/SEO para catálogo, Server Actions, View Transitions |
| Estilos | **Tailwind CSS v4** + tokens CSS propios | Tokens del diseño 1:1 con los mockups |
| UI | Lucide · Swiper/Embla (carruseles) · dnd-kit (tablero) · Motion | Probados en los mockups (Lucide, Swiper, SortableJS) |
| API | **Hono** (Node) + TypeScript | Liviano, tipado, separa el dominio del framework |
| DB | **PostgreSQL 17 + pgvector** (Docker, puerto local 5433) | Relacional + búsqueda semántica para Galú |
| ORM | **Drizzle** | SQL-first, migraciones versionadas |
| Jobs | **pg-boss** (cola sobre Postgres) | Automatizaciones y recordatorios sin infraestructura extra |
| Auth | **Better Auth** (email + Google) | Self-hosted, sin costo |
| Pagos | **Mercado Pago** Payment Brick + Checkout API + links de pago (sandbox) | Ver §6 |
| Envíos | **Andreani** (adapter) + **FakeAndreani** local | Ver §6 |
| Mensajes | WhatsApp Business (Cloud API) + mail (Mailpit local → Resend) | Ver §6 |
| Asistente | **Ollama** local → Claude Haiku 4.5 en prod | Gratis en local, mismo puerto |
| Imágenes | Disco local → Cloudinary free / R2 en prod | Puerto `ImageStorage` |
| Túnel webhooks | **cloudflared** | Mercado Pago y Andreani necesitan URL pública |
| Tests | Vitest (dominio) · Playwright (e2e + capturas en 4 tamaños) · MSW | |
| Calidad | Biome · Husky + commitlint (conventional commits) | |

---

## 4. Estructura del monorepo (Screaming + Hexagonal)

```
mini-galu/
├─ apps/
│  ├─ web/                        # Next.js: tienda + panel del taller
│  │  └─ src/
│  │     ├─ app/
│  │     │  ├─ (shop)/            # home, catalogo, producto/[slug], checkout, seguimiento, lista/[id]
│  │     │  ├─ (account)/         # cuenta: nenas, pedidos, favoritos, lista de cumple, gift cards
│  │     │  └─ (taller)/taller/   # resumen, pedidos, que-coser, productos, clientas, galu,
│  │     │                        # automatizaciones, tienda-y-pagos
│  │     ├─ features/             # catalog/, cart/, checkout/, tracking/, assistant/, orders-board/ …
│  │     │  └─ <feature>/{components (presentational), containers, hooks, api}
│  │     └─ ui/                   # atomic design: atoms/ molecules/ organisms/
│  └─ api/                        # Hono
│     └─ src/
│        ├─ catalog/              # productos, variantes, colecciones, lista de espera
│        ├─ cart/
│        ├─ orders/               # máquina de estados del pedido, picking
│        ├─ payments/             # PaymentGateway → MercadoPagoAdapter, FakePaymentAdapter
│        ├─ shipping/             # ShippingGateway → AndreaniAdapter, FakeAndreaniAdapter
│        ├─ notifications/        # MessageChannel → WhatsAppAdapter, MailAdapter, FakeChannel
│        ├─ automations/          # reglas (evento → acciones), plantillas, registro
│        ├─ production/           # demanda por talle, tandas de costura
│        ├─ customers/            # clientas, nenas (talle + cumple), notas
│        ├─ giftcards/
│        ├─ assistant/            # LlmProvider → OllamaAdapter, ClaudeAdapter; tools → casos de uso
│        ├─ content/              # portada, anuncios, lanzamientos programados
│        └─ shared/               # Result, errores, event bus, config
├─ packages/
│  ├─ contracts/                  # schemas zod + tipos compartidos web ↔ api
│  ├─ db/                         # schema Drizzle, migraciones, seed (datos curados del export viejo)
│  ├─ design-tokens/              # colores, tipografías, radios, motion → CSS vars + Tailwind
│  └─ config/                     # tsconfig, biome base
├─ design/mockups/                # HTML estático (Fase 0)
├─ docs/                          # PLAN, IDEAS, ROADMAP, ADRs
├─ local-assets/                  # (ignorada) fotos de prueba y export viejo
├─ docker-compose.yml             # postgres+pgvector, mailpit, ollama
└─ turbo.json / pnpm-workspace.yaml
```

Regla: `domain` no importa nada externo; `application` solo conoce puertos; `infrastructure` implementa puertos.
Los módulos se hablan por casos de uso o **eventos de dominio** (`PaymentApproved`, `OrderPacked`, `ShipmentDispatched`,
`ShipmentDelivered`, `StockReplenished`, `PaymentLinkExpired`) que disparan las automatizaciones.

---

## 5. Modelo de dominio (v1)

- **Product**: slug, nombre, descripción, colección, ocasiones, color, tejido, cuidados, precio (centavos), precio anterior, estado (borrador/publicado).
- **Variant**: talle (`12m`, `2`…`10`, `Único`), stock, medidas (largo/axila/cintura).
- **WaitlistEntry**: variante + contacto (WhatsApp/mail) + fecha → se avisa en orden cuando vuelve el stock.
- **Collection** / **Launch**: colección, fecha y hora de salida, prendas incluidas, anotadas.
- **Cart** (invitada o clienta) · **Order** (items con precio congelado) · **Payment** · **Shipment** (tracking + eventos).
- **Customer** + **ChildProfile** ("Mis nenas": nombre, cumple, talle) · **WishList** compartible (lista de cumple).
- **GiftCard** (código, saldo, vencimiento) · **Coupon**.
- **Automation** (evento, condiciones, acciones, plantilla, activa) + **AutomationRun** (registro).
- **ProductionBatch** ("tanda": variantes + cantidades a coser).
- **AssistantConversation** + **AssistantFact** (respuestas que Gaby le enseña).

Estados del pedido:

```
esperando_pago ─► nuevo ─► preparando ─► listo ─► en_camino ─► entregado
 (link MP)       (pago      (picking)     (etiqueta   (Andreani     (Andreani
                  aprobado)               o retiro)   retiró)       entregó)
```
`cancelado` y `reembolsado` desde cualquier estado previo a `en_camino`.
Los pasan el webhook de Mercado Pago, Gaby desde el tablero y los eventos de Andreani.

---

## 6. Integraciones

### Mercado Pago — pagos dentro de la web
- **Payment Brick** embebido en el checkout: la clienta paga **sin salir de la web** con
  **tarjeta de crédito** (cuotas), **tarjeta de débito** o **dinero en cuenta de Mercado Pago**.
- **Links de pago** desde el panel para ventas por Instagram/WhatsApp: el pedido queda en "Esperando pago",
  el stock se reserva 72 h y se libera solo si no paga.
- **Gift cards** compradas con los mismos medios y aplicables como saldo en el checkout.
- Webhook `/payments/webhook` validando firma `x-signature` · idempotencia por `external_reference = orderId`.
- Sandbox con usuarios de prueba (vendedora/compradora). Cuotas sin interés configurables desde el panel.

### Andreani
- La API oficial **requiere credenciales de cliente con contrato**. Puerto `ShippingGateway`:
  - `FakeAndreaniAdapter` (default local): cotiza por CP, genera nº de envío y etiqueta, simula eventos.
  - `AndreaniAdapter`: cotización, alta de envío, etiqueta PDF 10×15 y tracking cuando haya credenciales.
- Seguimiento público `/seguimiento?pedido=` (sin login) + job que consulta eventos cada N horas.
- Opciones: domicilio, sucursal Andreani, retiro en el taller con turnos.

### Mensajería (automatizaciones)
- Puerto `MessageChannel`: WhatsApp Business Cloud API (plantillas aprobadas por Meta) + mail.
- Local: `FakeChannel` que guarda los mensajes y los muestra en el panel; Mailpit para mails.
- Los mensajes de WhatsApp que inicia la empresa (plantillas) **tienen costo** según categoría y país
  (verificar tarifas vigentes de Meta antes de activarlos). Arrancar con mail + botón "abrir WhatsApp"
  con texto prellenado (gratis) y activar el envío automático cuando valga la pena.

### Galú (asistente)
- Streaming (SSE). El modelo **no inventa datos**: responde con **tools** que llaman casos de uso:
  `search_products`, `get_product`, `check_stock`, `recommend`, `size_guide`, `add_to_cart`, `track_order`,
  `shipping_quote`, `join_waitlist`.
- Búsqueda semántica con **pgvector** + filtros SQL de stock real. Respuestas con tarjetas y acciones de UI.
- Lo que no sabe se registra; Gaby le enseña la respuesta desde el panel (`AssistantFact`).
- Local: Ollama (gratis). Prod: Claude Haiku 4.5 (`claude-haiku-4-5`) — mismo puerto `LlmProvider`.

---

## 7. Pantallas (mockups)

**Tienda:** `index` · `catalogo` · `producto` · `checkout` · `seguimiento` · `cuenta`
**Panel del taller:** `admin` (resumen) · `admin-pedidos` · `admin-produccion` · `admin-productos` ·
`admin-clientas` · `admin-galu` · `admin-automatizaciones` · `admin-tienda`

Detalle de cada una en el [README de mockups](../design/mockups/README.md).

---

## 8. Fases

| Fase | Entregable | Hecho cuando… |
|---|---|---|
| **0. Diseño** ✅ | Mockups HTML (tienda + panel) + ideas | Gaby aprueba look & feel y flujo de pedidos |
| **1. Base** ✅ | Monorepo, docker-compose, CI, tokens, Biome, commitlint | `pnpm dev` levanta web+api+db |
| **2. Catálogo** 🟡 | `catalog` + `content`, seed legacy, panel de productos con stock por talle | Catálogo navegable con datos reales (✅ tienda; falta el panel) |
| **3. Checkout** | `cart`, `orders`, `payments` (Brick + webhook vía cloudflared) | Compra con crédito, débito y dinero en cuenta en sandbox |
| **4. Panel de pedidos** | Tablero, detalle, picking, links de pago | Gaby opera un pedido de punta a punta |
| **5. Envíos** | `shipping` con FakeAndreani + seguimiento público | Pedido pasa por todos los estados |
| **6. Automatizaciones** | `notifications` + `automations` + registro | Avisos salen solos (mail; WhatsApp en modo prueba) |
| **7. Galú** | `assistant` con Ollama + tools + "enseñale" | Responde stock/precio/talles con datos reales |
| **8. Cuenta** | Auth, nenas, favoritos, lista de cumple, gift cards, lista de espera | |
| **9. Pulido** | a11y, performance, SEO, e2e Playwright en 4 tamaños | Lighthouse ≥ 90 |
| **10. Deploy** | Vercel (web) + Render/Fly (api) + Neon (Postgres) — free tiers | URL pública |

---

## 9. Repo nuevo y cierre del viejo

1. ✅ Repo nuevo en GitHub, monorepo desde cero, sin historial viejo.
2. ✅ Subido a https://github.com/MaxLezano/mini-galu (`main` producción, `develop` desarrollo). Las imágenes quedan fuera.
3. ✅ No se copiaron `.env` viejos. ⏳ Rotar cualquier credencial de Google OAuth vieja.
4. ✅ El seed funciona con el nuevo schema (`pnpm db:reset`).
5. ✅ Borrados `mini-galu-back/`, `mini-galu-front/` y sus `.git` (antes se rescató la portada a `local-assets/legacy/`).

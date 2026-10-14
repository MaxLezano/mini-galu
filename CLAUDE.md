# CLAUDE.md — Mini Galú

Tienda, catálogo y sistema de pedidos automatizado para prendas de diseño para niñas (12 meses a talle 10).
Todo en español rioplatense (código de dominio, UI, commits y docs). Lo de terceros (React, Hono) queda en inglés.

## Fuentes de verdad (leer antes de cambiar algo)

1. `docs/PLAN.md` — stack, estructura, modelo de dominio, integraciones y fases.
2. `design/mockups/` — **cómo se ve y cómo funciona cada pantalla**. Son HTML estáticos aprobados; la app los replica.
   Verlos con `pnpm mockups` (http://localhost:5500). `design/mockups/README.md` dice qué probar en cada uno.
3. `docs/ROADMAP.md` — checklist de cada feature de los mockups con su estado. **Actualizarlo** al terminar algo.
4. `docs/IDEAS.md` (decisiones de la fase 0) y `docs/adr/` (decisiones de arquitectura).
5. `AGENTS.md` (Turborepo) y `apps/web/AGENTS.md` (Next) los regeneran las herramientas: esta versión de Next.js (16)
   tiene cambios; la doc está en
   `apps/web/node_modules/next/dist/docs/`.

## Comandos

```bash
pnpm db:up          # Postgres (puerto 5433) + Mailpit (http://localhost:8025)
pnpm db:reset       # borra la base local, migra y siembra (crea la cuenta del taller)
pnpm dev            # web :3000 + api :4000
pnpm lint           # Biome (pnpm lint:fix para arreglar)
pnpm typecheck && pnpm test      # tipos + Vitest en todos los paquetes
pnpm test:e2e       # Playwright (celular y escritorio); necesita la base con seed
pnpm shots <url> <nombre> [anchos]   # capturas 375/820/1440/2560 para comparar con los mockups
pnpm db:generate    # después de tocar packages/db/src/schema → nueva migración (no editar migraciones viejas)
```

## Arquitectura

```
apps/api/src/<módulo>/{domain, application, infrastructure}   ← Screaming + Hexagonal
apps/web/src/features/<feature>/{components, containers, *-store.ts, *.css}
apps/web/src/ui/{atoms, molecules, organisms}                  ← atomic design
packages/{contracts (zod), db (Drizzle), design-tokens, config}
```

- `domain` no importa nada externo (ni Drizzle, ni Hono, ni zod de request). `application` solo conoce puertos
  (`ports.ts`). `infrastructure` implementa puertos. Los adapters se eligen **solo** en `apps/api/src/app.ts`.
- Los módulos se hablan por casos de uso (ej. `content` usa `CatalogService`) o eventos de dominio (`shared/events`).
- Web ↔ API: siempre tipos de `@mini-galu/contracts`. La web nunca importa `@mini-galu/db`.
- Web: **container/presentational**. `components/` reciben props y no tocan stores ni fetch; `containers/` conectan
  stores (zustand), API y efectos. Server Components para cargar datos; `"use client"` solo donde hay interacción.

## Reglas del proyecto

- **Plata en centavos (`int`)**. Formatear solo con `formatARS` de contracts (igual en server y browser).
- **Fechas**: mostrar con `lib/date.ts` (zona America/Argentina/Buenos_Aires). Lo que depende del reloj o de
  `localStorage` se renderiza después de montar (`useMounted`, stores con `skipHydration`) para no romper la hidratación.
- **Visual = mockups** (ADR 0002). Los componentes usan las mismas clases que el mockup; el CSS vive en
  `apps/web/src/styles/atelier.css` y en el `.css` de cada feature. Antes de dar por terminada una pantalla,
  comparar con `pnpm shots` contra el mockup en 375 y 1440.
- **Tailwind va con prefijo `tw:`** (`className="tw:flex tw:gap-2"`). Sin prefijo, clases de los mockups como
  `.ring`, `.grid` o `.static` generan utilidades de Tailwind que pisan el diseño (pasó con el sello del hero).
- **Paleta cerrada**: solo tokens de `packages/design-tokens`. Sin azules ni colores de marcas; logos de terceros
  monocromos (`ui/atoms/BrandIcon`). Íconos Lucide (`lucide-react`), trazo 1.6. **Sin íconos de "IA"** (sparkles):
  Galú usa el foco (`ui/atoms/Foco`: foco con filamento de corazón, logo y firma de la marca).
- **Movimiento**: todo efecto nuevo respeta `prefers-reduced-motion` y `?static` (ver `features/shell/craft.ts`).
- Decisiones de la fase 0 que no se discuten: solo venta minorista con stock (sin preventa ni a medida); decir
  "clientes", no "clientas"; Mercado Pago dentro de la web; WhatsApp/Instagram como contacto discreto.
- Lo que todavía no existe se marca con `TODO(fase N · módulo)` y figura en `docs/ROADMAP.md`. No se inventan datos
  en la UI: si falta el backend, se dice (ver `ui/organisms/InTheWorks`).
- Seed (`packages/db/src/seed/data.ts`): productos reales; reseñas, anotadas y listas de espera son **demo**.
- **Ninguna imagen de contenido va al repo.** Fotos de prueba y export viejo: `local-assets/` (ignorada). En
  producción las fotos se suben desde el panel al `ImageStorage`.
- Secretos solo en `.env` (nunca commitear). `.env.example` documenta cada variable.
- **Pagos**: sin `MP_ACCESS_TOKEN` la API usa `SimulatedGateway` (local y CI); el titular de la tarjeta decide el
  resultado (APRO aprueba, OTHE rechaza, CONT pendiente). Nunca se aprueba un pedido sin consultar el pago al gateway.
- **Envíos**: sin `ANDREANI_*` en el `.env`, `FakeAndreani` da número, etiqueta y eventos que avanzan con el reloj
  (`FAKE_ANDREANI_SPEED` los acelera) y se cotiza con la tabla por zona; con credenciales, `AndreaniGateway` y
  `AndreaniRates` (API REST; docs de Andreani en `andreani/`, fuera del repo). El seguimiento es público: nunca
  mostrar la calle ni el apellido completo.
- **Stock**: se descuenta al crear el pedido (reserva de 30 min; links de pago, 72 h) dentro de una transacción; se devuelve al vencer o
  cancelar. Los e2e del checkout compran `mono-verde` (el de más stock del seed): si se agota, `pnpm db:reset`.

## Tests

- Dominio y casos de uso de la API: Vitest con repos en memoria (`<módulo>/testing/`). Todo caso de uso nuevo lleva test.
- Lógica pura de la web (estado de filtros, calculadora de talle): Vitest al lado del archivo.
- Flujos de usuario: `tests/e2e/*.spec.ts` (Playwright), en celular y escritorio.

## Git

Conventional commits (commitlint lo valida): `feat(catalog): …`, `fix(web): …`, `docs: …`. Scopes en
`commitlint.config.mjs`. Remoto: https://github.com/MaxLezano/mini-galu

- `develop`: desarrollo diario; todo lo nuevo entra acá (ramas `feat/…`, `fix/…` con PR y CI en verde).
- `main`: producción y deploy; solo recibe merges de `develop` ya probados. No se commitea directo en `main`.

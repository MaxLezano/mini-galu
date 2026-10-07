# Cómo contribuir

## Ramas

| Rama | Para qué |
|---|---|
| `main` | Producción y deploy. Solo recibe merges desde `develop` cuando una versión está probada. |
| `develop` | Desarrollo diario. Acá se integra todo lo nuevo. |
| `feat/…`, `fix/…`, `docs/…` | Trabajo puntual, sale de `develop` y vuelve a `develop` por PR. |

## Flujo

1. Rama desde `develop`: `feat/<algo>`, `fix/<algo>`, `docs/<algo>`.
2. Commits con **conventional commits** (commitlint lo valida en `commit-msg`):
   ```
   feat(catalog): lista de espera por talle
   fix(web): la bolsa no respetaba el stock máximo
   docs: actualizar roadmap de la fase 2
   ```
   Scopes válidos en [`commitlint.config.mjs`](commitlint.config.mjs) (módulos de la API, `web`, `db`, `contracts`, `tokens`…).
3. Antes de abrir el PR: `pnpm lint && pnpm typecheck && pnpm test` (y `pnpm test:e2e` si tocaste flujos de la tienda).
   El hook `pre-commit` corre Biome sobre lo que está en stage.
4. PR a `develop` con qué cambia, cómo probarlo y capturas si hay cambios visuales. CI tiene que estar en verde.
5. Si terminaste algo de los mockups, marcalo en [`docs/ROADMAP.md`](docs/ROADMAP.md).

## Dónde va cada cosa

| Quiero… | Lugar |
|---|---|
| Una regla de negocio | `apps/api/src/<módulo>/domain/` (función pura + test) |
| Un caso de uso | `apps/api/src/<módulo>/application/` (solo puertos) + test con repos en memoria |
| Hablar con DB / servicio externo | `apps/api/src/<módulo>/infrastructure/` implementando un puerto; conectarlo en `app.ts` |
| Un endpoint | `infrastructure/http/<módulo>-routes.ts`, input validado con un schema de `contracts` |
| Un tipo compartido web ↔ api | `packages/contracts/src/` |
| Cambiar tablas | `packages/db/src/schema/` → `pnpm db:generate` (nunca editar migraciones ya commiteadas) |
| Una pantalla | `apps/web/src/app/...` (ruta) + `apps/web/src/features/<feature>/` |
| Un componente reutilizable | `apps/web/src/ui/{atoms,molecules,organisms}` |
| Un color, radio o tipografía | `packages/design-tokens` (no hay colores fuera de la paleta) |

## Diseño

- La referencia es `design/mockups/` (ver [ADR 0002](docs/adr/0002-css-de-los-mockups-como-fuente.md)).
  Los componentes usan las mismas clases que el mockup.
- Compará antes de mergear: `pnpm shots http://localhost:3000/catalogo app-cat 375,1440` y
  `pnpm shots http://localhost:5500/catalogo.html mock-cat 375,1440` → `test-results/shots/`.
- Todo efecto respeta `prefers-reduced-motion` y `?static`.
- Responsive verificado en 375, 820, 1440 y 2560 px. Accesibilidad: foco visible, labels, contraste AA.

## Base de datos local

```bash
pnpm db:up       # levanta Postgres (5433) y Mailpit
pnpm db:reset    # vuelve al estado del seed
pnpm db:studio   # Drizzle Studio
```

El seed curado vive en `packages/db/src/seed/data.ts`. Las fotos de prueba y el export del proyecto viejo están en
`local-assets/` (ignorada por git; ver su README). **Ninguna imagen de contenido va al repo**: en producción se suben
desde el panel.

## Secretos

Nunca commitear `.env`. Cada variable nueva va a `.env.example` con un comentario. Credenciales de Mercado Pago y
Andreani solo de sandbox en local.

# 0002 · El CSS de los mockups es la fuente visual

- **Estado:** aceptada (fase 2)
- **Contexto:** los mockups HTML de la fase 0 están aprobados y tienen ~2.000 líneas de CSS con detalles finos
  (puntadas, arcos, animaciones de costura). Reescribirlos en utilidades de Tailwind arriesga perder detalles.
- **Decisión:** los tokens van a `packages/design-tokens/src/tokens.css`; el CSS base se copia 1:1 a
  `apps/web/src/styles/atelier.css` y el `<style>` de cada página a su feature (`features/home/home.css`, …).
  Los componentes React emiten **las mismas clases** que los mockups. Tailwind v4 se carga sin preflight y con los tokens
  como tema, para lo nuevo.
- **Consecuencias:** paridad visual verificable con `pnpm shots` (app vs. mockup). Un cambio visual se hace en el CSS del
  atelier (y en el mockup si sigue siendo referencia). No se introducen colores fuera de la paleta.

import { type ReactNode, ViewTransition } from "react";

/**
 * Transición entre páginas del mockup (`@view-transition { navigation: auto }` + `vtOut`/`vtIn` en styles.css): la
 * página que se va se desenfoca y la nueva sube. Va en el `template.tsx` (se vuelve a montar en cada navegación, el
 * layout no) y anima solo al entrar y salir: `default="none"` deja quietos los cambios dentro de la misma página.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter="vt-page" exit="vt-page" default="none">
      {children}
    </ViewTransition>
  );
}

import type { ReactNode } from "react";

/**
 * Pantalla en carga (`loading.tsx` de cada ruta): el skeleton va adentro con la forma de la página; los lectores de
 * pantalla escuchan "Cargando…" una vez.
 */
export function Loading({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <main className={className ? `skel-page ${className}` : "skel-page"} aria-busy="true" data-loading="">
      <span role="status" className="sr-only">
        Cargando…
      </span>
      {children}
    </main>
  );
}

import type { CSSProperties } from "react";

/**
 * Bloque de carga con la forma de lo que viene (atelier.css · Skeletons). La forma va en `className`: `line`,
 * `eyebrow-line`, `title`, `frame` (foto 3/4, `arch` para el arco), `pill`, `chip`, `thumb`, `avatar` o `box`.
 */
export function Skeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  return <span aria-hidden="true" className={className ? `skel ${className}` : "skel"} style={style} />;
}

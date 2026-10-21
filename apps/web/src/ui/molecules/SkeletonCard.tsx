import { Skeleton } from "@/ui/atoms/Skeleton";

/** Tarjeta de prenda en carga: la foto 3/4, el nombre y el precio. */
export function SkeletonCard({ arch = false }: { arch?: boolean }) {
  return (
    <div className="skel-card" aria-hidden="true">
      <Skeleton className={arch ? "frame arch" : "frame"} />
      <div className="skel-lines">
        <Skeleton className="line" style={{ width: "72%" }} />
        <Skeleton className="line" style={{ width: "34%" }} />
      </div>
    </div>
  );
}

/** Grilla de `count` tarjetas (4 columnas, 3 en tablet y 2 en celular, salvo que la grilla sea otra: `className`). */
export function SkeletonCards({ count = 8, className = "skel-cards" }: { count?: number; className?: string }) {
  return (
    <div className={className} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: tarjetas fijas, sin identidad
        <SkeletonCard key={i} arch={i % 4 === 1} />
      ))}
    </div>
  );
}

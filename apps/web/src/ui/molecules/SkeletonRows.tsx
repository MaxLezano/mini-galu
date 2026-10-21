import { Skeleton } from "@/ui/atoms/Skeleton";
import { SkeletonLines } from "./SkeletonLines";

/** Lista en carga (pedidos, clientes, reseñas…): miniatura, dos renglones y un estado a la derecha. */
export function SkeletonRows({ rows = 6, thumb = true }: { rows?: number; thumb?: boolean }) {
  return (
    <div className="skel-row-list" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: filas fijas, sin identidad
        <div className="skel-row" key={i}>
          {thumb && <Skeleton className="thumb" />}
          <SkeletonLines lines={2} />
          <Skeleton className="chip" style={{ width: 84, height: 28 }} />
        </div>
      ))}
    </div>
  );
}

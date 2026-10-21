import { Skeleton } from "@/ui/atoms/Skeleton";
import { SkeletonCards } from "@/ui/molecules/SkeletonCard";
import { SkeletonLines } from "@/ui/molecules/SkeletonLines";
import { Loading } from "@/ui/organisms/Loading";

/**
 * Una página de la tienda mientras carga: título, bajada y prendas (inicio, gift cards, listas) o, con `form`, una
 * columna con campos (ingresar, seguimiento, reseña, baja de las cartas).
 */
export function PageSkeleton({ form = false }: { form?: boolean }) {
  return (
    <Loading className={form ? "wrap skel-form" : "wrap"}>
      <div className="skel-head">
        <Skeleton className="eyebrow-line" />
        <Skeleton className="title" />
        <SkeletonLines lines={2} className="skel-lead" />
      </div>
      {form ? (
        <div className="skel-lines" style={{ gap: 14 }}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="pill" style={{ width: "100%", height: 52 }} />
          ))}
          <Skeleton className="pill" style={{ width: 180, height: 52, marginTop: 8 }} />
        </div>
      ) : (
        <SkeletonCards count={4} />
      )}
    </Loading>
  );
}

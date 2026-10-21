import { Skeleton } from "@/ui/atoms/Skeleton";
import { SkeletonCards } from "@/ui/molecules/SkeletonCard";
import { Loading } from "@/ui/organisms/Loading";

/** El catálogo mientras carga: la franja del título, los filtros (en escritorio) y la grilla de prendas. */
export function CatalogSkeleton() {
  return (
    <Loading>
      <div className="cat-band bg-linen hem-bottom">
        <div className="wrap">
          <div className="cat-hero">
            <div className="skel-lines" style={{ gap: 16 }}>
              <Skeleton className="eyebrow-line" />
              <Skeleton className="title" />
            </div>
          </div>
        </div>
      </div>
      <div className="wrap layout">
        <div className="skel-wide skel-lines" style={{ gap: 30 }}>
          {[4, 6, 5].map((n) => (
            <div className="skel-lines" key={n} style={{ gap: 14 }}>
              <Skeleton className="eyebrow-line" style={{ width: 90 }} />
              <div className="skel-chips">
                {Array.from({ length: n }, (_, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: chips fijos, sin identidad
                  <Skeleton key={i} className="chip" style={{ width: 48 + ((i * 17) % 34) }} />
                ))}
              </div>
            </div>
          ))}
        </div>
        <SkeletonCards count={9} className="grid" />
      </div>
    </Loading>
  );
}

import { Skeleton } from "@/ui/atoms/Skeleton";
import { SkeletonLines } from "@/ui/molecules/SkeletonLines";
import { Loading } from "@/ui/organisms/Loading";

/**
 * La ficha mientras carga: migas, la foto grande y la info. La foto se llama `product-hero` como la de la ficha, así
 * la de la tarjeta "viaja" hasta acá aunque la ficha todavía no llegó (craft.ts · heroOnCardClick).
 */
export function ProductSkeleton() {
  return (
    <Loading className="wrap">
      <div className="crumbs">
        <Skeleton className="line" style={{ width: 280, maxWidth: "70%" }} />
      </div>
      <div className="pdp">
        <div className="pdp-skel-gallery">
          <div>
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="frame" />
            ))}
          </div>
          <Skeleton className="frame pdp-skel-photo" />
        </div>
        <div className="skel-lines" style={{ gap: 18 }}>
          <Skeleton className="eyebrow-line" />
          <Skeleton className="title" style={{ width: "90%" }} />
          <Skeleton className="line" style={{ width: 120, fontSize: 24 }} />
          <SkeletonLines lines={3} />
          <div className="skel-chips" style={{ marginTop: 12 }}>
            {Array.from({ length: 6 }, (_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: talles fijos, sin identidad
              <Skeleton key={i} className="chip" style={{ width: 54, height: 46 }} />
            ))}
          </div>
          <Skeleton className="pill" style={{ width: "100%", height: 56, marginTop: 8 }} />
        </div>
      </div>
    </Loading>
  );
}

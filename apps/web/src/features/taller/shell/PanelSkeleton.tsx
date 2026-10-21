import { Skeleton } from "@/ui/atoms/Skeleton";
import { SkeletonRows } from "@/ui/molecules/SkeletonRows";
import { Loading } from "@/ui/organisms/Loading";

/** Una sección del panel mientras carga: título con acciones, filtros y la lista. */
export function PanelSkeleton() {
  return (
    <Loading className="adm-content">
      <div className="adm-head">
        <div className="skel-lines" style={{ gap: 12, width: "min(320px, 100%)" }}>
          <Skeleton className="eyebrow-line" style={{ width: 90 }} />
          <Skeleton className="title" style={{ height: 40, width: "100%" }} />
        </div>
        <div className="skel-chips">
          <Skeleton className="pill" style={{ height: 38 }} />
          <Skeleton className="pill skel-wide" style={{ height: 38, width: 140 }} />
        </div>
      </div>
      <div className="skel-chips">
        {[88, 70, 96, 64].map((w) => (
          <Skeleton key={w} className="chip" style={{ width: w, height: 34 }} />
        ))}
      </div>
      <div className="box">
        <SkeletonRows rows={7} />
      </div>
    </Loading>
  );
}

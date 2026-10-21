import { Skeleton } from "@/ui/atoms/Skeleton";
import { SkeletonCards } from "@/ui/molecules/SkeletonCard";
import { SkeletonLines } from "@/ui/molecules/SkeletonLines";
import { Loading } from "@/ui/organisms/Loading";

/** El inicio mientras carga: el hero (oscuro, porque el header va claro encima) y la primera fila de prendas. */
export function HomeSkeleton() {
  return (
    <Loading>
      <section className="hero skel-hero">
        <div className="wrap skel-lines">
          <Skeleton className="eyebrow-line" />
          <Skeleton className="title" />
          <SkeletonLines lines={2} className="skel-lead" />
          <Skeleton className="pill" style={{ width: 200, height: 52, marginTop: 10 }} />
        </div>
      </section>
      <div className="wrap">
        <div className="skel-head">
          <Skeleton className="eyebrow-line" />
          <Skeleton className="title" style={{ width: "min(420px, 70%)" }} />
        </div>
        <SkeletonCards count={4} />
      </div>
    </Loading>
  );
}

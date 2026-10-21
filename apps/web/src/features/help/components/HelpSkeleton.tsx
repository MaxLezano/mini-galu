import { Skeleton } from "@/ui/atoms/Skeleton";
import { SkeletonLines } from "@/ui/molecules/SkeletonLines";
import { Loading } from "@/ui/organisms/Loading";

/** La ayuda mientras carga: título, temas a un costado y secciones. */
export function HelpSkeleton() {
  return (
    <Loading className="wrap help">
      <header className="help-hero skel-lines" style={{ gap: 18 }}>
        <Skeleton className="eyebrow-line" />
        <Skeleton className="title" />
        <SkeletonLines lines={2} />
      </header>
      <div className="help-layout">
        <div className="help-side">
          <div className="skel-lines">
            {Array.from({ length: 6 }, (_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: temas fijos, sin identidad
              <Skeleton key={i} className="pill" style={{ width: "100%", height: 44 }} />
            ))}
          </div>
        </div>
        <div className="skel-lines" style={{ gap: 40 }}>
          {[4, 3, 5].map((n) => (
            <div className="skel-lines" key={n} style={{ gap: 14 }}>
              <Skeleton className="line" style={{ width: "46%", fontSize: 26 }} />
              <SkeletonLines lines={n} />
            </div>
          ))}
        </div>
      </div>
    </Loading>
  );
}

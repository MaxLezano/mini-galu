import { Skeleton } from "@/ui/atoms/Skeleton";
import { SkeletonCards } from "@/ui/molecules/SkeletonCard";
import { SkeletonLines } from "@/ui/molecules/SkeletonLines";
import { Loading } from "@/ui/organisms/Loading";

/** Mi cuenta mientras carga (la ruta y los datos de la cuenta, que se piden en el navegador). */
export function AccountSkeleton() {
  return (
    <Loading className="wrap acc">
      <div className="side">
        <div className="me">
          <Skeleton className="avatar" />
          <SkeletonLines lines={2} />
        </div>
        <div className="skel-lines skel-wide">
          {[70, 58, 64, 52, 66, 48].map((w, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: secciones fijas, sin identidad
            <Skeleton key={i} className="line" style={{ width: `${w}%`, fontSize: 18 }} />
          ))}
        </div>
      </div>
      <div className="skel-lines" style={{ gap: 18 }}>
        <Skeleton className="title" style={{ width: "50%" }} />
        <SkeletonLines lines={2} />
        <SkeletonCards count={4} />
      </div>
    </Loading>
  );
}

import { Skeleton } from "@/ui/atoms/Skeleton";
import { Loading } from "@/ui/organisms/Loading";

/** El checkout (y el link de pago) mientras carga: pasos, campos y el resumen al costado. */
export function CheckoutSkeleton() {
  return (
    <Loading className="wrap co">
      <div className="skel-lines" style={{ gap: 18 }}>
        <div className="skel-chips">
          {[96, 84, 72].map((w) => (
            <Skeleton key={w} className="chip" style={{ width: w }} />
          ))}
        </div>
        <Skeleton className="title" style={{ width: "60%" }} />
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="pill" style={{ width: "100%", height: 52 }} />
        ))}
        <Skeleton className="box" style={{ minHeight: 180 }} />
      </div>
      <Skeleton className="box skel-wide" style={{ minHeight: 360 }} />
    </Loading>
  );
}

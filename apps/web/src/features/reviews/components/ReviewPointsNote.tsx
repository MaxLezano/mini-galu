import { pointsHint, pointsToGo, type ReviewableOrder } from "@mini-galu/contracts";
import { Star } from "lucide-react";
import Link from "next/link";

/** Puntos por reseñas: cuánto suma cada una, cuántos tiene ese mail y, si le alcanzan, a dónde ir a canjear. */
export function ReviewPointsNote({ points }: { points: NonNullable<ReviewableOrder["points"]> }) {
  const togo = pointsToGo(points.rules, points.balance);
  return (
    <aside className="rv-points" aria-label="Tus puntos">
      <Star className="i-sm" />
      <div>
        <p>{pointsHint(points.rules)}</p>
        <p className="muted">
          Tenés <b>{points.balance} puntos</b>
          {togo > 0 ? `: te faltan ${togo} para el cupón.` : ". "}
          {togo === 0 && <Link href="/cuenta#puntos">Canjealos en Mi cuenta</Link>}
        </p>
      </div>
    </aside>
  );
}

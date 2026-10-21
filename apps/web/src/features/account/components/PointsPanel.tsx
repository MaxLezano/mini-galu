import { type PointsSummary, pointsHint, pointsToGo } from "@mini-galu/contracts";
import { TicketPercent } from "lucide-react";
import Link from "next/link";
import { longDateYear } from "@/lib/date";

type Props = {
  /** null: el mail de la cuenta no está confirmado. */
  points: PointsSummary | null;
  now: Date;
  busy: boolean;
  onRedeem: () => void;
};

/** Pestaña "Puntos" de Mi cuenta (sin mockup, con las piezas de las gift cards): saldo, canje y cupones. */
export function PointsPanel({ points, now, busy, onRedeem }: Props) {
  const head = (
    <div className="panel-head">
      <span className="eyebrow is-in">Puntos</span>
      <h1 className="display h2">
        Tus <em>puntos</em>
      </h1>
      {points && (
        <p className="lead" style={{ margin: 0 }}>
          {pointsHint(points.rules)}
        </p>
      )}
    </div>
  );
  if (!points)
    return (
      <>
        {head}
        <p className="muted">
          Confirmá tu email para ver y canjear tus puntos: te mandamos el link al crear la cuenta (lo ves en{" "}
          <a href="#datos">Mis datos</a>).
        </p>
      </>
    );

  const { rules, balance } = points;
  const togo = pointsToGo(rules, balance);
  return (
    <>
      {head}
      <div className="pts-card">
        <div className="pts-balance">
          <b>{balance}</b> {balance === 1 ? "punto" : "puntos"}
        </div>
        <div
          className="pts-meter"
          role="meter"
          aria-label="Puntos para el cupón"
          aria-valuemin={0}
          aria-valuemax={rules.threshold}
          aria-valuenow={Math.min(balance, rules.threshold)}
        >
          <span style={{ width: `${Math.min(100, (balance / rules.threshold) * 100)}%` }} />
        </div>
        <p className="muted" style={{ margin: 0 }}>
          {!rules.enabled
            ? "Por ahora los puntos están en pausa: los que tenés siguen guardados."
            : togo > 0
              ? `Te faltan ${togo} para un ${rules.percent}% de descuento. Dejá la reseña de tus prendas desde Pedidos.`
              : `Ya podés canjear ${rules.threshold} puntos por un ${rules.percent}% de descuento (vale ${rules.validDays} días).`}
        </p>
        {rules.enabled && (
          <button type="button" className="btn" disabled={busy || togo > 0} onClick={onRedeem}>
            {busy ? "Canjeando…" : `Canjear ${rules.threshold} puntos`}
          </button>
        )}
      </div>
      {points.coupons.map((c) => {
        const expired = new Date(c.endsAt).getTime() < now.getTime();
        return (
          <div className="my-gc" key={c.code}>
            <TicketPercent className="i-sm" />
            <span>
              <code>{c.code}</code> · {c.label}
              {c.used
                ? " · ya lo usaste."
                : expired
                  ? " · venció."
                  : ` · vence el ${longDateYear(c.endsAt)}. Se carga en el checkout con el email de tu cuenta.`}
            </span>
          </div>
        );
      })}
      {!points.coupons.length && togo > 0 && (
        <p className="muted" style={{ fontSize: 13.5 }}>
          Las reseñas suman cuando las publicamos. <Link href="#pedidos">Ver mis pedidos</Link>
        </p>
      )}
    </>
  );
}

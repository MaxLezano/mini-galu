import { formatARS, type OrderReceipt, PAYMENT_METHODS } from "@mini-galu/contracts";
import { Clock, House, PackageSearch, Scissors, Store, Truck } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const COLORS = ["#E8C6BF", "#B0643E", "#8B9A7C", "#A3302B", "#EADFD0"];

type Confetti = { left: number; color: string; duration: number; delay: number; rotate: number };

/** Pago aprobado (o en revisión) — checkout.html → #done. */
export function SuccessOverlay({
  receipt,
  pickupLabel,
  deliveryDetail,
  still,
}: {
  receipt: OrderReceipt;
  /** Franja elegida para retirar ("Jue 8 · 10 a 13 h"). */
  pickupLabel: string | null;
  /** Plazo de Andreani ("Llega en 2 a 3 días hábiles"). */
  deliveryDetail: string | null;
  /** Sin animaciones (prefers-reduced-motion / ?static). */
  still: boolean;
}) {
  const [on, setOn] = useState(false);
  const [confetti, setConfetti] = useState<Confetti[]>([]);
  const pending = receipt.status === "esperando_pago";

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const raf = requestAnimationFrame(() => setOn(true));
    if (!still && !pending)
      setConfetti(
        Array.from({ length: 70 }, () => ({
          left: Math.random() * 100,
          color: COLORS[Math.floor(Math.random() * COLORS.length)] as string,
          duration: 2.4 + Math.random() * 2.6,
          delay: Math.random() * 0.8,
          rotate: Math.random() * 360,
        })),
      );
    return () => {
      cancelAnimationFrame(raf);
      document.body.style.overflow = "";
    };
  }, [still, pending]);

  const method = receipt.paymentMethod ? PAYMENT_METHODS[receipt.paymentMethod] : null;
  const steps =
    receipt.shippingMethod === "taller"
      ? [
          { icon: <Scissors />, title: "Hoy", text: "Preparamos tu pedido en el taller" },
          { icon: <Store />, title: pickupLabel ?? "El día elegido", text: "Lo retirás en el taller de Villa Crespo" },
        ]
      : [
          { icon: <Scissors />, title: "Hoy", text: "Preparamos tu pedido en el taller" },
          { icon: <Truck />, title: "Después", text: "Sale con Andreani con número de seguimiento" },
          {
            icon: <House />,
            title: deliveryDetail ?? "En unos días",
            text:
              receipt.shippingMethod === "sucursal"
                ? `Lo retirás en la sucursal${receipt.branchLabel ? ` ${receipt.branchLabel.split(" · ")[0]}` : ""}`
                : "Llega a tu casa",
          },
        ];

  return (
    <div className={`done-ov ${on ? "is-on" : ""}`} aria-live="polite" role="dialog" aria-label="Pago aprobado">
      <div className="confetti">
        {confetti.map((c, i) => (
          <i
            // biome-ignore lint/suspicious/noArrayIndexKey: piezas decorativas fijas
            key={i}
            style={{
              left: `${c.left}%`,
              background: c.color,
              animationDuration: `${c.duration}s`,
              animationDelay: `${c.delay}s`,
              transform: `rotate(${c.rotate}deg)`,
            }}
          />
        ))}
      </div>
      <div style={{ position: "relative", maxWidth: 720 }}>
        <svg
          className="bowdraw"
          viewBox="0 0 40 26"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M20 11C14 3 4 1 3 8s9 9 17 3Z" />
          <path d="M20 11c6-8 16-10 17-3s-9 9-17 3Z" />
          <path d="M18 12.5 13 24M22 12.5 27 24" />
          <circle cx="20" cy="11.2" r="2.6" />
        </svg>
        <span className="eyebrow is-in">
          {pending ? "Pago en revisión" : "Pago aprobado"}
          {method ? ` · ${method}` : ""} · Pedido #{receipt.number}
        </span>
        <h2 className="display h1" style={{ margin: "16px 0" }}>
          ¡Gracias, <em>{receipt.firstName}!</em>
        </h2>
        <p className="lead" style={{ margin: "0 auto 28px" }}>
          {pending ? (
            <>
              Mercado Pago está revisando el pago de {formatARS(receipt.totalCents)}. Apenas se apruebe, el pedido pasa
              al taller. Guardá el número <b>#{receipt.number}</b>.
            </>
          ) : (
            <>
              Gaby ya recibió tu pedido. Guardá el número <b>#{receipt.number}</b>: con él seguís cada paso.
            </>
          )}
        </p>
        {pending ? (
          <div className="done-steps" style={{ gridTemplateColumns: "1fr", maxWidth: 420 }}>
            <div>
              <Clock />
              <b>En revisión</b>Suele resolverse en minutos; algunas tarjetas tardan hasta 2 días hábiles.
            </div>
          </div>
        ) : (
          <div className="done-steps" style={steps.length === 2 ? { gridTemplateColumns: "1fr 1fr" } : undefined}>
            {steps.map((s) => (
              <div key={s.text}>
                {s.icon}
                <b>{s.title}</b>
                {s.text}
              </div>
            ))}
          </div>
        )}
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link className="btn" href={`/seguimiento?pedido=${encodeURIComponent(receipt.number)}`}>
            Seguir mi pedido <PackageSearch />
          </Link>
          <Link className="btn btn-ghost" href="/">
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}

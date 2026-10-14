import { formatARS, type OrderReceipt, PAYMENT_METHODS } from "@mini-galu/contracts";
import { CalendarHeart, Clock, Gift, House, Mail, PackageSearch, Scissors, Store, Truck } from "lucide-react";
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
  const gift = receipt.kind === "giftcard" ? receipt.giftcard : null;
  const steps = gift
    ? [
        { icon: <Mail />, title: "Ahora", text: `Te mandamos el código a ${receipt.email}` },
        gift.via === "mail"
          ? {
              icon: gift.deliverOn ? <CalendarHeart /> : <Gift />,
              title: gift.deliverOn ? "El día elegido" : "Ya mismo",
              text: `Le llega a ${gift.toName} por mail${gift.deliverOn ? ", a las 9" : ""}`,
            }
          : {
              icon: <Gift />,
              title: "Cuando quieras",
              text: `Se la mandás a ${gift.toName} por WhatsApp desde el mail`,
            },
      ]
    : receipt.shippingMethod === "taller"
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
          viewBox="0 0 40 46"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M15 33c-.6-4.6-7-7.6-7-16C8 10.2 13.3 6.5 20 6.5S32 10.2 32 17c0 8.4-6.4 11.4-7 16" />
          <path d="M17.4 33c-.6-4.2-3.6-9-3.2-13.6.3-3.6 5.4-4 6 .4 1.2-3.2 6.2-2.6 5.6 1.2-.5 3.8-4.6 7-5.2 12" />
          <path d="M14.5 34.5h11M15.2 37.2h9.6M16.2 39.9h7.6M18 42.6h4" />
          <path d="M15.5 1.5 17 5M24.5 1.5 23.5 5M4 11.5l3.2 1.4M35.5 9.5l-3 1.8M33.5 19h3.5" />
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
          ) : gift ? (
            <>
              La gift card para {gift.toName} ya está activa. Guardá el número <b>#{receipt.number}</b> por cualquier
              consulta.
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
          {gift ? (
            <Link className="btn" href="/catalogo">
              Ver la tienda
            </Link>
          ) : (
            <Link className="btn" href={`/seguimiento?pedido=${encodeURIComponent(receipt.number)}`}>
              Seguir mi pedido <PackageSearch />
            </Link>
          )}
          <Link className="btn btn-ghost" href="/">
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}

import { type CardPlans, type CartLine, formatARS, type Quote } from "@mini-galu/contracts";
import { ChevronDown, RefreshCcw, Scissors, ShoppingBag, TicketPercent, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { SITE } from "@/lib/site";
import { BrandIcon } from "@/ui/atoms/BrandIcon";

type Props = {
  lines: CartLine[];
  quote: Quote | null;
  /** Texto de cuotas de Mercado Pago para el total (solo dice "sin interés" si lo confirma Mercado Pago). */
  installmentsText: string | null;
  /** Planes de la tarjeta que se está cargando: reemplazan al texto general de cuotas. */
  cardPlans: CardPlans | null;
  /** Cuotas elegidas en el formulario de pago: el resumen muestra cuánto se paga así. */
  chosenInstallments: number | null;
  couponBusy: boolean;
  /** Por qué no se aplicó el cupón (queda debajo del campo). */
  couponError: string | null;
  onCouponInput: () => void;
  onApplyCoupon: (code: string) => void;
  onRemoveCoupon: () => void;
  onEditBag: () => void;
};

/** Resumen lateral (checkout.html → .summary). En celular es un desplegable arriba. */
export function OrderSummary({
  lines,
  quote,
  installmentsText,
  cardPlans,
  chosenInstallments,
  couponBusy,
  couponError,
  onCouponInput,
  onApplyCoupon,
  onRemoveCoupon,
  onEditBag,
}: Props) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const subtotal = quote?.subtotalCents ?? lines.reduce((a, l) => a + l.priceCents * l.qty, 0);
  const total = quote?.totalCents ?? subtotal;
  const chosen = (chosenInstallments && cardPlans?.plans.find((p) => p.installments === chosenInstallments)) || null;

  return (
    <aside className={`summary ${open ? "is-open" : ""}`} aria-label="Resumen del pedido">
      <button type="button" className="sum-toggle" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
          <ShoppingBag className="i-sm" /> Ver resumen
        </span>
        <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
          <b>{formatARS(total)}</b>
          <ChevronDown className="i-sm" />
        </span>
      </button>
      <div className="sum-inner">
        <div className="row">
          <h3>Tu pedido</h3>
          <button type="button" className="link" style={{ fontSize: 13 }} onClick={onEditBag}>
            Editar bolsa
          </button>
        </div>
        <div style={{ display: "grid", gap: 16 }}>
          {lines.length ? (
            lines.map((l) => (
              <div className="s-item" key={`${l.slug}-${l.size}`}>
                <span className="ph">
                  <img src={l.imageUrl} alt="" />
                  <span className="q">{l.qty}</span>
                </span>
                <span>
                  <b>{l.name}</b>
                  <span className="muted">Talle {l.size}</span>
                </span>
                <span>{formatARS(l.priceCents * l.qty)}</span>
              </div>
            ))
          ) : (
            <p className="muted" style={{ margin: 0 }}>
              Tu bolsa está vacía.{" "}
              <Link className="link" href="/catalogo">
                Ver catálogo
              </Link>
            </p>
          )}
        </div>
        <hr className="seam" />
        <div>
          {quote?.coupon ? (
            <div className="applied">
              <TicketPercent className="i-sm" /> Cupón {quote.coupon.label}
              <button
                type="button"
                className="icon-btn"
                style={{ width: 28, height: 28, marginLeft: "auto" }}
                aria-label="Quitar cupón"
                onClick={onRemoveCoupon}
              >
                <X className="i-sm" />
              </button>
            </div>
          ) : (
            <form
              className="coupon"
              onSubmit={(e) => {
                e.preventDefault();
                onApplyCoupon(code);
              }}
            >
              <input
                className="input"
                placeholder="Cupón de descuento"
                aria-label="Cupón de descuento"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  onCouponInput();
                }}
                aria-invalid={!!couponError}
                aria-describedby={couponError ? "coupon-error" : undefined}
                style={{ textTransform: "uppercase" }}
              />
              <button type="submit" className="btn btn-sm btn-ghost" disabled={couponBusy}>
                {couponBusy ? "Revisando…" : "Aplicar"}
              </button>
            </form>
          )}
          {couponError && !quote?.coupon && (
            <span className="field-error" id="coupon-error" role="alert" style={{ display: "block", marginTop: 8 }}>
              {couponError}
            </span>
          )}
        </div>
        <div className="totals">
          <div className="row">
            <span className="muted">Subtotal</span>
            <span>{formatARS(subtotal)}</span>
          </div>
          {quote?.coupon && quote.discountCents > 0 && (
            <div className="row">
              <span className="muted">Cupón {quote.coupon.code}</span>
              <span style={{ color: "var(--salvia-d)" }}>-{formatARS(quote.discountCents)}</span>
            </div>
          )}
          <div className="row">
            <span className="muted">Envío</span>
            <span>
              {quote && quote.shippingCents > 0 ? (
                formatARS(quote.shippingCents)
              ) : quote ? (
                <b style={{ color: "var(--salvia-d)" }}>Gratis</b>
              ) : (
                <span className="muted">—</span>
              )}
            </span>
          </div>
          <div className="row total">
            <span>Total</span>
            <span>{formatARS(total)}</span>
          </div>
          {chosen ? (
            <div className="card-plans is-chosen" aria-live="polite">
              <div className="row">
                <span>
                  {chosen.installments === 1 ? "Pagás en 1 pago" : `Pagás en ${chosen.installments} cuotas de`}
                </span>
                <b>{formatARS(chosen.installments === 1 ? chosen.totalCents : chosen.installmentCents)}</b>
              </div>
              {chosen.installments > 1 && (
                <>
                  <div className="row">
                    <span className="muted">
                      {chosen.interestFree ? "Sin interés · total" : "Total con el interés de tu tarjeta"}
                    </span>
                    <span>{formatARS(chosen.totalCents)}</span>
                  </div>
                  {!chosen.interestFree && chosen.cft && (
                    <small className="muted">
                      CFT {chosen.cft}. El interés lo cobra tu tarjeta; el taller recibe {formatARS(total)}.
                    </small>
                  )}
                </>
              )}
            </div>
          ) : cardPlans ? (
            <div className="card-plans">
              <span className="muted">
                Con tu tarjeta{cardPlans.brand ? ` ${cardPlans.brand}` : ""} (elegís las cuotas en el pago):
              </span>
              {cardPlans.plans.map((p) => (
                <div className="row" key={p.installments}>
                  <span>
                    {p.installments === 1
                      ? "1 pago"
                      : `${p.installments} cuotas de ${formatARS(p.installmentCents)}${p.interestFree ? " sin interés" : ""}`}
                  </span>
                  <span>
                    <b>{formatARS(p.totalCents)}</b>
                    {!p.interestFree && p.cft && <small className="muted"> · CFT {p.cft}</small>}
                  </span>
                </div>
              ))}
              {cardPlans.plans.some((p) => !p.interestFree) && (
                <small className="muted">
                  El interés de las cuotas lo cobra tu tarjeta; el taller recibe el total de arriba.
                </small>
              )}
            </div>
          ) : (
            installmentsText && (
              <div className="muted" style={{ fontSize: 12.5, textAlign: "right" }}>
                o {installmentsText[0]?.toLowerCase()}
                {installmentsText.slice(1)}
              </div>
            )
          )}
        </div>
        <div className="secure">
          <BrandIcon name="mercadopago" /> Pago seguro con Mercado Pago
        </div>
        <ul className="promise">
          <li>
            <RefreshCcw />
            <span>
              <b>30 días para cambiar el talle</b>Sin uso y con la etiqueta.
            </span>
          </li>
          <li>
            <Scissors />
            <span>
              <b>Revisada a mano antes de salir</b>Cada prenda pasa por las manos de Gaby.
            </span>
          </li>
          <li>
            <BrandIcon name="whatsapp" />
            <span>
              <b>¿Dudas? Escribinos</b>
              <a className="link" href={SITE.whatsapp} target="_blank" rel="noopener">
                WhatsApp del taller
              </a>
            </span>
          </li>
        </ul>
        <span className="hand promise-note">gracias por elegir algo hecho a mano ♡</span>
      </div>
    </aside>
  );
}

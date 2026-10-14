"use client";

import { type CheckoutConfig, formatARS, type OrderReceipt, type PayResult } from "@mini-galu/contracts";
import { ChevronDown, Info, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { GiftcardCard } from "@/features/giftcards/components/GiftcardCard";
import { isStill } from "@/features/shell/craft";
import { toast } from "@/features/shell/ui-store";
import { ApiRequestError, api } from "@/lib/api";
import { launchWhen } from "@/lib/date";
import { SITE } from "@/lib/site";
import { Embroidery } from "@/ui/atoms/Embroidery";
import { SimulatedBrick, type SimulatedCard } from "../components/SimulatedBrick";
import { SuccessOverlay } from "../components/SuccessOverlay";
import { MercadoPagoBrick } from "./MercadoPagoBrick";
import "../checkout.css";

type Props = {
  config: CheckoutConfig;
  initial: OrderReceipt;
  token: string;
  /** Vuelta de Mercado Pago (dinero en cuenta) con el id del pago. */
  paymentId: string | null;
};

/**
 * Página de un link de pago (ventas por Instagram/WhatsApp): el cliente paga sin cuenta con el mismo Brick del
 * checkout. Se llega con el número y el token del pedido (/pagar/MG-1046?t=…).
 */
export function PayLinkView({ config, initial, token, paymentId }: Props) {
  const [receipt, setReceipt] = useState(initial);
  const [done, setDone] = useState<OrderReceipt | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const order = { number: receipt.number, accessToken: token, totalCents: receipt.totalCents };

  // vuelta de Mercado Pago: se confirma el pago y se muestra el resultado
  useEffect(() => {
    if (!paymentId) return;
    (async () => {
      await api.syncPayment(initial.number, token, paymentId).catch(() => undefined);
      const r = await api.receipt(initial.number, token).catch(() => null);
      if (!r) return;
      setReceipt(r);
      if (r.status !== "cancelado") setDone(r);
    })();
  }, [paymentId, initial.number, token]);

  const onPayResult = async (r: PayResult) => {
    if (r.outcome === "rejected") return setPayError(r.message);
    const fresh = await api.receipt(receipt.number, token);
    setReceipt(fresh);
    setDone(fresh);
  };

  const paySimulated = async (card: SimulatedCard) => {
    setBusy(true);
    setPayError(null);
    try {
      await onPayResult(
        await api.payCard(receipt.number, token, {
          method: card.method,
          token: `sim-${crypto.randomUUID()}`,
          paymentMethodId: "visa",
          installments: card.installments,
          payer: { email: receipt.email },
          holderName: card.holderName,
        }),
      );
    } catch (e) {
      setPayError(e instanceof ApiRequestError ? e.message : "No pudimos procesar el pago. Probá de nuevo.");
    } finally {
      setBusy(false);
    }
  };

  const payWallet = async () => {
    setBusy(true);
    try {
      const p = await api.wallet(receipt.number, token);
      if (p.redirectUrl) location.assign(p.redirectUrl);
    } catch (e) {
      toast(e instanceof ApiRequestError ? e.message : "No pudimos ir a Mercado Pago. Probá de nuevo.", {
        icon: <Info className="i-sm" />,
      });
      setBusy(false);
    }
  };

  const waiting = receipt.status === "esperando_pago";
  const gift = receipt.kind === "giftcard" ? receipt.giftcard : null;
  const shippingLabel = receipt.shippingMethod === "taller" ? "Retiro en el taller" : "Envío";

  return (
    <main className="wrap co">
      <div>
        <span className="eyebrow is-in">
          {gift ? "Gift card" : "Pedido"} #{receipt.number}
        </span>
        <h1 className="display h2" style={{ marginTop: 12 }}>
          {waiting ? (
            <>
              Hola, <em>{receipt.firstName}</em>
            </>
          ) : (
            <>
              Tu <em>pedido</em>
            </>
          )}
        </h1>

        {waiting ? (
          <section className="box" style={{ marginTop: 24, display: "grid", gap: 16 }} aria-label="Pago">
            {gift ? (
              <p className="muted" style={{ margin: 0 }}>
                Tu gift card para {gift.toName} está lista.{" "}
                {gift.via === "mail"
                  ? `Apenas se apruebe el pago le llega por mail${gift.deliverOn ? " el día elegido, a las 9" : ""}.`
                  : "Apenas se apruebe el pago te mandamos el código y el botón para mandársela por WhatsApp."}
              </p>
            ) : (
              <p className="muted" style={{ margin: 0 }}>
                Gaby te reservó estas prendas
                {receipt.reservedUntil ? ` hasta el ${launchWhen(receipt.reservedUntil)}` : ""}. Pagás acá mismo, con
                tarjeta o con dinero en cuenta de Mercado Pago.
              </p>
            )}
            {config.gateway === "mercadopago" ? (
              <MercadoPagoBrick config={config} order={order} email={receipt.email} onResult={onPayResult} />
            ) : (
              <SimulatedBrick
                methods={config.methods}
                maxInstallments={config.maxInstallments}
                totalCents={receipt.totalCents}
                busy={busy}
                error={payError}
                onPayCard={paySimulated}
                onPayWallet={payWallet}
              />
            )}
          </section>
        ) : (
          <div className="box empty-state" style={{ marginTop: 24 }}>
            <Embroidery />
            {receipt.status === "cancelado" ? (
              <>
                <div className="hand" style={{ fontSize: 30 }}>
                  Este link ya venció
                </div>
                {gift ? (
                  <>
                    <p className="muted" style={{ margin: 0 }}>
                      La gift card no se llegó a pagar. Podés armarla de nuevo en un minuto.
                    </p>
                    <Link className="btn" href="/giftcards#armala">
                      Armar otra gift card
                    </Link>
                  </>
                ) : (
                  <>
                    <p className="muted" style={{ margin: 0 }}>
                      Las prendas volvieron a la tienda. Escribinos y te armamos uno nuevo.
                    </p>
                    <a className="btn" href={SITE.whatsapp} target="_blank" rel="noopener">
                      Escribir por WhatsApp
                    </a>
                  </>
                )}
              </>
            ) : (
              <>
                <div className="hand" style={{ fontSize: 30 }}>
                  {gift ? "Esta gift card ya está pagada ♡" : "Este pedido ya está pagado ♡"}
                </div>
                {gift ? (
                  <p className="muted" style={{ margin: 0 }}>
                    Te mandamos el código a {receipt.email}.
                  </p>
                ) : (
                  <Link className="btn" href={`/seguimiento?pedido=${receipt.number}`}>
                    Seguir mi pedido
                  </Link>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <aside className={`summary ${open ? "is-open" : ""}`} aria-label="Resumen del pedido">
        <button type="button" className="sum-toggle" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
            <ShoppingBag className="i-sm" /> Ver resumen
          </span>
          <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
            <b>{formatARS(receipt.totalCents)}</b>
            <ChevronDown className="i-sm" />
          </span>
        </button>
        <div className="sum-inner">
          <div className="row">
            <h3>{gift ? "Tu gift card" : "Tu pedido"}</h3>
          </div>
          {gift && (
            <div style={{ display: "grid", gap: 10 }}>
              <GiftcardCard design={gift.design} amountCents={gift.amountCents} toName={gift.toName} logoSize={20} />
              <span className="muted">De parte de {gift.fromName}</span>
            </div>
          )}
          <div style={{ display: "grid", gap: 16 }}>
            {receipt.items.map((i) => (
              <div className="s-item" key={`${i.name}-${i.size}`}>
                <span className="ph">
                  <img src={i.imageUrl} alt="" />
                  <span className="q">{i.qty}</span>
                </span>
                <span>
                  <b>{i.name}</b>
                  <span className="muted">Talle {i.size}</span>
                </span>
                <span>{formatARS(i.unitPriceCents * i.qty)}</span>
              </div>
            ))}
          </div>
          <hr className="seam" />
          <div className="totals">
            <div className="row">
              <span className="muted">Subtotal</span>
              <span>{formatARS(receipt.subtotalCents)}</span>
            </div>
            {receipt.discountCents > 0 && (
              <div className="row">
                <span className="muted">Descuento</span>
                <span>-{formatARS(receipt.discountCents)}</span>
              </div>
            )}
            <div className="row" hidden={!!gift}>
              <span className="muted">{shippingLabel}</span>
              <span>
                {receipt.shippingCents > 0
                  ? formatARS(receipt.shippingCents)
                  : receipt.shippingMethod === "taller"
                    ? "Sin costo"
                    : "Gratis"}
              </span>
            </div>
            <div className="row total">
              <span>Total</span>
              <span>{formatARS(receipt.totalCents)}</span>
            </div>
          </div>
        </div>
      </aside>

      {done && <SuccessOverlay receipt={done} pickupLabel={null} deliveryDetail={null} still={isStill()} />}
    </main>
  );
}

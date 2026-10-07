"use client";

import {
  type CheckoutConfig,
  formatARS,
  type OrderReceipt,
  type PayResult,
  type PlacedOrder,
  PROVINCES,
  type Quote,
  type ShippingOptions,
} from "@mini-galu/contracts";
import { ArrowLeft, ArrowRight, Info } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useCart } from "@/features/cart/cart-store";
import { isStill } from "@/features/shell/craft";
import { toast, useUi } from "@/features/shell/ui-store";
import { ApiRequestError, api } from "@/lib/api";
import { Embroidery } from "@/ui/atoms/Embroidery";
import {
  type ContactForm,
  contactError,
  EMPTY_CONTACT,
  EMPTY_SHIPPING,
  quotablePostalCode,
  type ShippingForm,
  shippingError,
  shippingSummary,
  toShippingInput,
} from "../checkout-form";
import { OrderSummary } from "../components/OrderSummary";
import { SimulatedBrick, type SimulatedCard } from "../components/SimulatedBrick";
import { StepCard, Stepper } from "../components/Steps";
import { SuccessOverlay } from "../components/SuccessOverlay";
import { MercadoPagoBrick } from "./MercadoPagoBrick";
import "../checkout.css";

type Return = { pedido: string; t: string; paymentId: string | null } | null;

/** Checkout en 3 pasos — design/mockups/checkout.html */
export function CheckoutView({ config, back }: { config: CheckoutConfig; back: Return }) {
  const lines = useCart((s) => s.lines);
  const refreshCart = useCart((s) => s.refresh);
  const setDrawer = useUi((s) => s.setDrawer);

  const [step, setStep] = useState(1);
  const [contact, setContact] = useState<ContactForm>(EMPTY_CONTACT);
  const [ship, setShip] = useState<ShippingForm>(EMPTY_SHIPPING);
  const [options, setOptions] = useState<ShippingOptions | null>(null);
  const [coupon, setCoupon] = useState<string | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [order, setOrder] = useState<(PlacedOrder & { key: string }) | null>(null);
  const [fieldError, setFieldError] = useState<{ field: string; message: string } | null>(null);
  const [payError, setPayError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<OrderReceipt | null>(null);
  const [returning, setReturning] = useState(!!back);

  const cartKey = lines.map((l) => `${l.slug}:${l.size}:${l.qty}`).join("|");
  const cp = ship.method === "taller" ? undefined : quotablePostalCode(ship.postalCode) ? ship.postalCode : undefined;
  /** El pedido se crea al pasar al pago; si cambia algo de esto, se vuelve a crear (y el anterior se cancela). */
  const orderKey = JSON.stringify([cartKey, contact, toShippingInput(ship), coupon]);
  const currentOrder = order?.key === orderKey ? order : null;

  // al entrar: bolsa fresca del servidor
  useEffect(() => {
    void refreshCart();
  }, [refreshCart]);

  // vuelta de Mercado Pago (dinero en cuenta): se confirma el pago y se muestra el resultado
  useEffect(() => {
    if (!back) return;
    (async () => {
      try {
        if (back.paymentId) await api.syncPayment(back.pedido, back.t, back.paymentId).catch(() => undefined);
        const r = await api.receipt(back.pedido, back.t);
        if (r.status !== "esperando_pago" && r.status !== "cancelado") {
          setDone(r);
          void refreshCart();
        } else if (back.paymentId) setDone(r);
        else
          toast("El pago con Mercado Pago no se completó. Podés intentarlo de nuevo.", {
            icon: <Info className="i-sm" />,
          });
      } catch {
        toast("No encontramos ese pedido", { icon: <Info className="i-sm" /> });
      } finally {
        setReturning(false);
        history.replaceState(null, "", "/checkout");
      }
    })();
  }, [back, refreshCart]);

  // opciones de envío (precios según CP; el subtotal de la bolsa decide el envío gratis)
  // biome-ignore lint/correctness/useExhaustiveDependencies: cartKey cambia el subtotal que cotiza la API
  useEffect(() => {
    let alive = true;
    const t = setTimeout(() => {
      api
        .shipping(cp)
        .then((o) => alive && setOptions(o))
        .catch(() => undefined);
    }, 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [cp, cartKey]);

  // cotización: subtotal, cupón, envío y total
  const email = contactError(contact) === null ? contact.email.trim().toLowerCase() : undefined;
  useEffect(() => {
    if (!cartKey) return setQuote(null);
    let alive = true;
    api
      .quote({ method: ship.method, postalCode: cp, couponCode: coupon ?? undefined, email })
      .then((q) => {
        if (!alive) return;
        setQuote(q);
        if (coupon && q.couponError) {
          toast(q.couponError, { icon: <Info className="i-sm" /> });
          setCoupon(null);
        }
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [cartKey, ship.method, cp, coupon, email]);

  const go = (n: number) => {
    setStep(n);
    setFieldError(null);
    setPayError(null);
    requestAnimationFrame(() =>
      document
        .querySelector(`[data-step="${n}"]`)
        ?.scrollIntoView({ behavior: isStill() ? "auto" : "smooth", block: "start" }),
    );
  };

  const focus = (id: string) => requestAnimationFrame(() => document.getElementById(id)?.focus());

  const nextFromContact = () => {
    const e = contactError(contact);
    if (e) {
      setFieldError(e);
      return focus(`f-${e.field}`);
    }
    go(2);
  };

  const placeOrder = useCallback(async () => {
    setBusy(true);
    try {
      const placed = await api.placeOrder({ contact, shipping: toShippingInput(ship), couponCode: coupon });
      setOrder({ ...placed, key: orderKey });
      return true;
    } catch (e) {
      const msg = e instanceof ApiRequestError ? e.message : "No pudimos crear el pedido. Probá de nuevo.";
      toast(msg, { icon: <Info className="i-sm" /> });
      if (e instanceof ApiRequestError && e.status === 409) void refreshCart();
      return false;
    } finally {
      setBusy(false);
    }
  }, [contact, ship, coupon, orderKey, refreshCart]);

  const nextFromShipping = async () => {
    const e = shippingError(ship);
    if (e) {
      setFieldError(e);
      return focus(`f-${e.field}`);
    }
    if (await placeOrder()) go(3);
  };

  // en el paso 3, si cambió algo (cupón, bolsa), el pedido se rehace
  useEffect(() => {
    if (step === 3 && !currentOrder && !busy && lines.length) void placeOrder();
  }, [step, currentOrder, busy, lines.length, placeOrder]);

  const onPayResult = async (r: PayResult) => {
    if (!currentOrder) return;
    if (r.outcome === "rejected") return setPayError(r.message);
    const receipt = await api.receipt(currentOrder.number, currentOrder.accessToken);
    setDone(receipt);
    void refreshCart();
  };

  const paySimulated = async (card: SimulatedCard) => {
    if (!currentOrder) return;
    setBusy(true);
    setPayError(null);
    try {
      await onPayResult(
        await api.payCard(currentOrder.number, currentOrder.accessToken, {
          method: card.method,
          token: `sim-${crypto.randomUUID()}`,
          paymentMethodId: "visa",
          installments: card.installments,
          payer: { email: contact.email },
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
    if (!currentOrder) return;
    setBusy(true);
    try {
      const p = await api.wallet(currentOrder.number, currentOrder.accessToken);
      if (p.redirectUrl) location.assign(p.redirectUrl);
    } catch (e) {
      setPayError(e instanceof ApiRequestError ? e.message : "No pudimos ir a Mercado Pago. Probá de nuevo.");
      setBusy(false);
    }
  };

  const applyCoupon = (code: string) => {
    if (!code.trim()) return toast("Escribí un cupón", { icon: <Info className="i-sm" /> });
    setCoupon(code.trim().toUpperCase());
  };

  const selected = options?.options.find((o) => o.method === ship.method);
  const slotLabel = options?.pickupSlots.find((s) => s.id === ship.pickupSlot)?.label;
  const setS = <K extends keyof ShippingForm>(k: K, v: ShippingForm[K]) => setShip((x) => ({ ...x, [k]: v }));
  const setC = <K extends keyof ContactForm>(k: K, v: ContactForm[K]) => setContact((x) => ({ ...x, [k]: v }));
  const err = (field: string) =>
    fieldError?.field === field ? (
      <span className="field-error" role="alert">
        {fieldError.message}
      </span>
    ) : null;

  const totalCents = currentOrder?.totalCents ?? quote?.totalCents ?? 0;
  const empty = !lines.length && !done && !returning;
  const contactSummary = useMemo(() => `${contact.email} · ${contact.phone}`, [contact.email, contact.phone]);

  return (
    <main className="wrap co">
      <div>
        <Link className="link" href="/catalogo" style={{ fontSize: 13 }}>
          <ArrowLeft className="i-sm" /> Seguir comprando
        </Link>
        <h1 className="display h2" style={{ marginTop: 18 }}>
          Último <em>paso</em>
        </h1>

        {empty ? (
          <div className="box empty-state" style={{ marginTop: 28 }}>
            <Embroidery />
            <div className="hand" style={{ fontSize: 32 }}>
              Tu bolsa está vacía
            </div>
            <Link className="btn" href="/catalogo">
              Ver catálogo
            </Link>
          </div>
        ) : (
          <>
            <Stepper step={step} />
            <StepCard
              n={1}
              title="Tus datos"
              step={step}
              summary={contactSummary}
              onEdit={step > 1 ? () => go(1) : undefined}
            >
              {/* TODO(fase 8 · cuenta): "Continuar con Google" y datos guardados de la cuenta */}
              <div className="field">
                <label htmlFor="f-email">Email</label>
                <input
                  className="input"
                  id="f-email"
                  type="email"
                  autoComplete="email"
                  value={contact.email}
                  onChange={(e) => setC("email", e.target.value)}
                />
                {err("email")}
              </div>
              <div className="grid2">
                <div className="field">
                  <label htmlFor="f-firstName">Nombre</label>
                  <input
                    className="input"
                    id="f-firstName"
                    autoComplete="given-name"
                    value={contact.firstName}
                    onChange={(e) => setC("firstName", e.target.value)}
                  />
                  {err("firstName")}
                </div>
                <div className="field">
                  <label htmlFor="f-lastName">Apellido</label>
                  <input
                    className="input"
                    id="f-lastName"
                    autoComplete="family-name"
                    value={contact.lastName}
                    onChange={(e) => setC("lastName", e.target.value)}
                  />
                  {err("lastName")}
                </div>
              </div>
              <div className="field">
                <label htmlFor="f-phone">Celular</label>
                <input
                  className="input"
                  id="f-phone"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="11 5555-1234"
                  value={contact.phone}
                  onChange={(e) => setC("phone", e.target.value)}
                />
                {err("phone")}
              </div>
              <label className="check">
                <input
                  type="checkbox"
                  checked={contact.whatsappOptIn}
                  onChange={(e) => setC("whatsappOptIn", e.target.checked)}
                />{" "}
                Quiero recibir el seguimiento por WhatsApp
              </label>
              <button type="button" className="btn" onClick={nextFromContact}>
                Continuar al envío <ArrowRight />
              </button>
            </StepCard>
            <StepCard
              n={2}
              title="Envío"
              step={step}
              summary={shippingSummary(ship, slotLabel)}
              onEdit={step > 2 ? () => go(2) : undefined}
            >
              {ship.method !== "taller" && (
                <div className="grid2">
                  <div className="field">
                    <label htmlFor="f-postalCode">Código postal</label>
                    <input
                      className="input"
                      id="f-postalCode"
                      inputMode="numeric"
                      autoComplete="postal-code"
                      value={ship.postalCode}
                      onChange={(e) => setS("postalCode", e.target.value.toUpperCase())}
                    />
                    {err("postalCode")}
                  </div>
                  <div className="field">
                    <label htmlFor="f-province">Provincia</label>
                    <select
                      className="input"
                      id="f-province"
                      value={ship.province}
                      onChange={(e) => setS("province", e.target.value as ShippingForm["province"])}
                    >
                      {PROVINCES.map((p) => (
                        <option key={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
              {(options?.options ?? []).map((o) => (
                <label className="option" key={o.method}>
                  <input
                    type="radio"
                    name="ship"
                    value={o.method}
                    checked={ship.method === o.method}
                    onChange={() => setS("method", o.method)}
                  />
                  <span>
                    <b>{o.label}</b>
                    {o.method !== "taller" && <span className="carrier">ANDREANI</span>}
                    <small>{o.detail}</small>
                  </span>
                  <span className="opt-price" style={o.cents === 0 ? { color: "var(--salvia-d)" } : undefined}>
                    {o.cents === null ? "—" : o.cents === 0 ? "Gratis" : formatARS(o.cents)}
                  </span>
                </label>
              ))}
              {ship.method === "domicilio" && (
                <>
                  <div className="grid2">
                    <div className="field">
                      <label htmlFor="f-street">Calle</label>
                      <input
                        className="input"
                        id="f-street"
                        autoComplete="address-line1"
                        value={ship.street}
                        onChange={(e) => setS("street", e.target.value)}
                      />
                      {err("street")}
                    </div>
                    <div className="grid2" style={{ gap: 12 }}>
                      <div className="field">
                        <label htmlFor="f-number">Altura</label>
                        <input
                          className="input"
                          id="f-number"
                          inputMode="numeric"
                          value={ship.number}
                          onChange={(e) => setS("number", e.target.value)}
                        />
                        {err("number")}
                      </div>
                      <div className="field">
                        <label htmlFor="f-unit">Piso / depto</label>
                        <input
                          className="input"
                          id="f-unit"
                          autoComplete="address-line2"
                          value={ship.unit}
                          onChange={(e) => setS("unit", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="field">
                    <label htmlFor="f-city">Localidad</label>
                    <input
                      className="input"
                      id="f-city"
                      autoComplete="address-level2"
                      value={ship.city}
                      onChange={(e) => setS("city", e.target.value)}
                    />
                    {err("city")}
                  </div>
                  <div className="field">
                    <label htmlFor="f-notes">
                      Indicaciones para la entrega{" "}
                      <small className="muted" style={{ fontWeight: 400 }}>
                        (opcional)
                      </small>
                    </label>
                    <input
                      className="input"
                      id="f-notes"
                      placeholder="Ej. casa blanca con portón negro"
                      value={ship.notes}
                      onChange={(e) => setS("notes", e.target.value)}
                    />
                  </div>
                </>
              )}
              {ship.method === "taller" && (
                <div className="field" id="f-pickupSlot" tabIndex={-1}>
                  <span className="lbl">¿Cuándo pasás a retirar?</span>
                  <div className="slots">
                    {(options?.pickupSlots ?? []).map((s) => (
                      <button
                        type="button"
                        key={s.id}
                        className={`chip ${ship.pickupSlot === s.id ? "is-on" : ""}`}
                        aria-pressed={ship.pickupSlot === s.id}
                        onClick={() => setS("pickupSlot", s.id)}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                  {err("pickupSlot")}
                </div>
              )}
              <button type="button" className="btn" disabled={busy} onClick={nextFromShipping}>
                {busy ? "Reservando tus prendas…" : "Continuar al pago"} <ArrowRight />
              </button>
            </StepCard>
            <StepCard n={3} title="Pago" step={step}>
              {!currentOrder ? (
                <p className="muted">Reservando tus prendas…</p>
              ) : config.gateway === "mercadopago" ? (
                <MercadoPagoBrick config={config} order={currentOrder} email={contact.email} onResult={onPayResult} />
              ) : (
                <SimulatedBrick
                  methods={config.methods}
                  maxInstallments={config.maxInstallments}
                  totalCents={totalCents}
                  busy={busy}
                  error={payError}
                  onPayCard={paySimulated}
                  onPayWallet={payWallet}
                />
              )}
              {currentOrder && (
                <p className="muted" style={{ fontSize: 12.5, margin: 0, textAlign: "center" }}>
                  Te guardamos las prendas 30 minutos mientras pagás.
                </p>
              )}
            </StepCard>
          </>
        )}
      </div>

      <OrderSummary
        lines={lines}
        quote={quote}
        maxInstallments={config.methods.credito ? config.maxInstallments : 1}
        couponBusy={false}
        onApplyCoupon={applyCoupon}
        onRemoveCoupon={() => setCoupon(null)}
        onEditBag={() => setDrawer(true)}
      />

      {done && (
        <SuccessOverlay
          receipt={done}
          pickupLabel={slotLabel ?? null}
          deliveryDetail={selected?.method !== "taller" ? (selected?.detail ?? null) : null}
          still={isStill()}
        />
      )}
    </main>
  );
}

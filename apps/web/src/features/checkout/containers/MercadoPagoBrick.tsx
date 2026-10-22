"use client";

import { initMercadoPago, Payment, usePaymentBrick } from "@mercadopago/sdk-react";
import type { CardPaymentInput, CheckoutConfig, PayResult } from "@mini-galu/contracts";
import { Lock } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiRequestError, api } from "@/lib/api";

let initialized: string | null = null;
/** Cuánto espera la pestaña de la tienda a que se pague en Mercado Pago (lo que dura la reserva). */
const WAIT_MS = 30 * 60_000;

/** El tipo del SDK exige al menos un medio; los activos los decide el panel. */
type BrickMethods = Parameters<typeof Payment>[0]["customization"]["paymentMethods"];

type Props = {
  config: CheckoutConfig;
  order: { number: string; accessToken: string; totalCents: number };
  email: string;
  onResult: (r: PayResult) => void;
  /** Primeros dígitos de la tarjeta que se está cargando (null si se borra). */
  onCardBin?: (bin: string | null) => void;
  /** Cuotas elegidas en el formulario de Mercado Pago (null si todavía no eligió). */
  onInstallments?: (n: number | null) => void;
};

/**
 * Payment Brick de Mercado Pago (crédito, débito y dinero en cuenta) con los colores del taller.
 * La tarjeta se tokeniza en el Brick; la web solo manda el token a la API, que cobra.
 */
export function MercadoPagoBrick({ config, order, email, onResult, onCardBin, onInstallments }: Props) {
  const [preferenceId, setPreferenceId] = useState<string | null | undefined>(
    config.methods.dinero_cuenta ? undefined : null,
  );
  const [error, setError] = useState<string | null>(null);
  // dinero en cuenta: el Brick abre Mercado Pago en otra pestaña y esta queda esperando
  const [waiting, setWaiting] = useState(false);

  if (config.publicKey && initialized !== config.publicKey) {
    initMercadoPago(config.publicKey, { locale: "es-AR" });
    initialized = config.publicKey;
  }

  // dinero en cuenta necesita una preferencia creada en la API antes de mostrar el Brick
  useEffect(() => {
    if (!config.methods.dinero_cuenta) return;
    let alive = true;
    api
      .wallet(order.number, order.accessToken)
      .then((p) => alive && setPreferenceId(p.preferenceId))
      .catch(() => alive && setPreferenceId(null));
    return () => {
      alive = false;
    };
  }, [config.methods.dinero_cuenta, order.number, order.accessToken]);

  // El Brick del SDK se vuelve a armar cada vez que cambian estas props (las compara por referencia): tienen que
  // ser estables. Si no, cada render del checkout (escribir el cupón) montaba otro formulario encima.
  const latest = useRef({ order, email, onResult, onCardBin, onInstallments });
  latest.current = { order, email, onResult, onCardBin, onInstallments };
  const { credito, debito, dinero_cuenta } = config.methods;

  // el monto inicial sale del pedido; si después cambia (cupón) se actualiza en el Brick montado, sin rearmarlo
  const initialization = useMemo(
    () => ({
      amount: latest.current.order.totalCents / 100,
      preferenceId: preferenceId ?? undefined,
      payer: { email: latest.current.email },
    }),
    [preferenceId],
  );
  const { update } = usePaymentBrick();
  const shownAmount = useRef(order.totalCents);
  useEffect(() => {
    if (shownAmount.current === order.totalCents) return;
    shownAmount.current = order.totalCents;
    // la gift card cubrió todo: el pedido ya quedó pagado y no hay nada que cobrar (actualizarlo a $0 rompía un ícono
    // del Brick y la preferencia respondía 409)
    if (order.totalCents === 0) return;
    update({ amount: order.totalCents / 100 });
    // dinero en cuenta cobra lo que dice la preferencia: se actualiza la misma
    const { order: o } = latest.current;
    if (preferenceId) void api.wallet(o.number, o.accessToken, preferenceId).catch(() => undefined);
  }, [order.totalCents, preferenceId, update]);

  const customization = useMemo(() => {
    const css = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return {
      paymentMethods: {
        ...(credito ? { creditCard: "all" } : {}),
        ...(debito ? { debitCard: "all" } : {}),
        ...(dinero_cuenta && preferenceId ? { mercadoPago: "all" } : {}),
        maxInstallments: config.maxInstallments,
      } as BrickMethods,
      visual: {
        style: {
          theme: "default" as const,
          customVariables: {
            baseColor: css("--cacao"),
            // hover y presionado: sin estas el Brick usa su azul (paleta cerrada del taller)
            baseColorFirstVariant: css("--cacao-2"),
            baseColorSecondVariant: css("--cacao-2"),
            outlineSecondaryColor: css("--line-2"),
            textPrimaryColor: css("--cacao"),
            textSecondaryColor: css("--cacao-2"),
            formBackgroundColor: css("--paper"),
            inputBackgroundColor: css("--paper-2"),
            outlinePrimaryColor: css("--line-2"),
            buttonTextColor: css("--paper"),
            errorColor: css("--rojo"),
            successColor: css("--salvia-d"),
            borderRadiusMedium: "14px",
            borderRadiusLarge: "20px",
          },
        },
      },
    };
  }, [credito, debito, dinero_cuenta, preferenceId, config.maxInstallments]);

  const onSubmit = useCallback<Parameters<typeof Payment>[0]["onSubmit"]>(
    async ({ selectedPaymentMethod, formData }) => {
      const { order: o, email: mail, onResult: done } = latest.current;
      setError(null);
      // dinero en cuenta: el Brick lleva a Mercado Pago con la preferencia y vuelve a /checkout
      // (también "Crédito de Mercado Pago", que se paga en Mercado Pago con la misma preferencia)
      if (selectedPaymentMethod === "wallet_purchase" || selectedPaymentMethod === "onboarding_credits") {
        setWaiting(true);
        return;
      }
      const card: CardPaymentInput = {
        method: selectedPaymentMethod === "debitCard" || selectedPaymentMethod === "prepaidCard" ? "debito" : "credito",
        token: formData.token,
        paymentMethodId: formData.payment_method_id,
        issuerId: formData.issuer_id ? String(formData.issuer_id) : null,
        installments: Number(formData.installments) || 1,
        payer: {
          email: formData.payer?.email || mail,
          identification: formData.payer?.identification
            ? { type: formData.payer.identification.type, number: formData.payer.identification.number }
            : null,
        },
      };
      let result: PayResult;
      try {
        result = await api.payCard(o.number, o.accessToken, card);
      } catch (e) {
        setError(e instanceof ApiRequestError ? e.message : "No pudimos procesar el pago. Probá de nuevo.");
        throw e;
      }
      // rechazado: el mensaje va acá y la promesa se rechaza para que el Brick salga de "procesando" y deje
      // reintentar (si se resolvía, quedaba trabado con el botón en el azul de Mercado Pago)
      if (result.outcome === "rejected") {
        setError(result.message);
        throw new Error(result.message);
      }
      done(result);
    },
    [],
  );

  const onError = useCallback((e: unknown) => console.warn("[mercado pago]", e), []);
  // el Brick no avisa qué cuota se elige: con los primeros dígitos se consulta el plan de esa tarjeta
  const onBinChange = useCallback((bin: string) => {
    latest.current.onCardBin?.(bin || null);
    latest.current.onInstallments?.(null);
  }, []);

  // El SDK tampoco avisa la cuota elegida, pero el formulario se dibuja en esta página: las opciones son radios
  // name="installments" con la cantidad de cuotas como value. Si Mercado Pago cambia su HTML, no pasa nada:
  // el resumen vuelve a mostrar el plan completo de la tarjeta.
  const containerId = `mp-brick-${order.number}`.replace(/[^\w-]/g, "");
  useEffect(() => {
    const onChange = (e: Event) => {
      const el = e.target;
      if (!(el instanceof HTMLInputElement) || el.name !== "installments" || !el.closest(`#${containerId}`)) return;
      const n = Number(el.value);
      latest.current.onInstallments?.(Number.isInteger(n) && n > 0 ? n : null);
    };
    document.addEventListener("change", onChange);
    return () => document.removeEventListener("change", onChange);
  }, [containerId]);

  // mientras paga en la otra pestaña, esta pregunta si ya se pagó (la API le consulta a Mercado Pago): sin esto
  // quedaba con "Pagar" trabado y, sin webhook ni vuelta, la tienda no se enteraba
  useEffect(() => {
    if (!waiting) return;
    let alive = true;
    const started = Date.now();
    const tick = async () => {
      const { order: o, onResult: done } = latest.current;
      const r = await api.checkPayment(o.number, o.accessToken).catch(() => null);
      if (!alive) return;
      if (r?.paid) return done({ outcome: "approved", message: "¡Pago aprobado!" });
      if (Date.now() - started < WAIT_MS) timer = setTimeout(tick, 4000);
    };
    let timer = setTimeout(tick, 4000);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [waiting]);

  if (preferenceId === undefined) return <p className="muted">Preparando el pago…</p>;

  // cada pedido en su propio contenedor (un cambio de total no lo rearma: se actualiza el monto)
  const brickId = containerId;

  return (
    <>
      <Payment
        key={brickId}
        id={brickId}
        initialization={initialization}
        locale="es-AR"
        customization={customization}
        onSubmit={onSubmit}
        onError={onError}
        onBinChange={onBinChange}
      />
      {error && (
        <p className="pay-error" role="alert">
          {error}
        </p>
      )}
      {waiting && (
        <p className="pay-waiting" role="status">
          Seguí en la pestaña de Mercado Pago. Cuando se apruebe el pago, la confirmación aparece acá.
        </p>
      )}
      <div className="secure">
        <Lock className="i-sm" /> Los datos de tu tarjeta los procesa Mercado Pago, nunca pasan por nuestra web.
      </div>
    </>
  );
}

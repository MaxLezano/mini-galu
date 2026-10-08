"use client";

import { initMercadoPago, Payment } from "@mercadopago/sdk-react";
import type { CardPaymentInput, CheckoutConfig, PayResult } from "@mini-galu/contracts";
import { Lock } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiRequestError, api } from "@/lib/api";

let initialized: string | null = null;

/** El tipo del SDK exige al menos un medio; los activos los decide el panel. */
type BrickMethods = Parameters<typeof Payment>[0]["customization"]["paymentMethods"];

type Props = {
  config: CheckoutConfig;
  order: { number: string; accessToken: string; totalCents: number };
  email: string;
  onResult: (r: PayResult) => void;
};

/**
 * Payment Brick de Mercado Pago (crédito, débito y dinero en cuenta) con los colores del taller.
 * La tarjeta se tokeniza en el Brick; la web solo manda el token a la API, que cobra.
 */
export function MercadoPagoBrick({ config, order, email, onResult }: Props) {
  const [preferenceId, setPreferenceId] = useState<string | null | undefined>(
    config.methods.dinero_cuenta ? undefined : null,
  );
  const [error, setError] = useState<string | null>(null);

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
  const latest = useRef({ order, email, onResult });
  latest.current = { order, email, onResult };
  const { credito, debito, dinero_cuenta } = config.methods;

  const initialization = useMemo(
    () => ({
      amount: order.totalCents / 100,
      preferenceId: preferenceId ?? undefined,
      payer: { email: latest.current.email },
    }),
    [order.totalCents, preferenceId],
  );

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
      if (selectedPaymentMethod === "wallet_purchase" || selectedPaymentMethod === "onboarding_credits") return;
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
      try {
        done(await api.payCard(o.number, o.accessToken, card));
      } catch (e) {
        setError(e instanceof ApiRequestError ? e.message : "No pudimos procesar el pago. Probá de nuevo.");
      }
    },
    [],
  );

  const onError = useCallback((e: unknown) => console.warn("[mercado pago]", e), []);

  if (preferenceId === undefined) return <p className="muted">Preparando el pago…</p>;

  // cada pedido/total en su propio contenedor: el viejo se desmonta con su DOM
  const brickId = `mp-brick-${order.number}-${order.totalCents}`.replace(/[^\w-]/g, "");

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
      />
      {error && (
        <p className="pay-error" role="alert">
          {error}
        </p>
      )}
      <div className="secure">
        <Lock className="i-sm" /> Los datos de tu tarjeta los procesa Mercado Pago, nunca pasan por nuestra web.
      </div>
    </>
  );
}

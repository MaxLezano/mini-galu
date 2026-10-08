import { createHmac, timingSafeEqual } from "node:crypto";
import type { PaymentMethod } from "@mini-galu/contracts";
import type { GatewayPayment, PaymentGateway } from "../application/ports";

const API = "https://api.mercadopago.com";

/** Orden de la API de Orders (lo que usamos de ella). */
type MpOrder = {
  id: string;
  status: string;
  status_detail: string | null;
  total_amount: string;
  external_reference: string | null;
  transactions?: {
    payments?: {
      id: string;
      amount: string;
      status: string;
      status_detail: string | null;
      payment_method?: { id: string; type: string; installments?: number };
    }[];
  };
};

/** Pago de la API de Payments: lo genera "dinero en cuenta" (preferencia) y se consulta por su id. */
type MpPayment = {
  id: number;
  status: string;
  status_detail: string | null;
  payment_type_id: string | null;
  installments: number | null;
  transaction_amount: number;
  external_reference: string | null;
};

const METHOD: Record<string, PaymentMethod> = {
  credit_card: "credito",
  debit_card: "debito",
  prepaid_card: "debito",
  account_money: "dinero_cuenta",
};

/**
 * Mercado Pago. Tarjetas: API de Orders (`/v1/orders`, la vigente; la de Payments se discontinúa) con el token del
 * Payment Brick. Dinero en cuenta: preferencia `wallet_purchase` que el Brick usa para llevar a Mercado Pago; el pago
 * que resulta se consulta en `/v1/payments`. Credenciales de prueba o de producción según `mode`.
 *
 * Probado contra el sandbox (titular → respuesta): APRO 201 processed/accredited · CONT 201 processing/in_process ·
 * OTHE 402 failed/rejected_by_issuer · FUND 402 insufficient_amount · SECU 402 bad_filled_card_data.
 * En prueba, el email del pagador tiene que ser de un usuario de prueba (test_user_<id>@testuser.com).
 */
export class MercadoPagoGateway implements PaymentGateway {
  readonly kind = "mercadopago" as const;

  constructor(
    private readonly cfg: {
      accessToken: string;
      publicKey: string;
      webhookSecret: string | null;
      mode: "prueba" | "produccion";
      /** Solo si es https (Mercado Pago no acepta localhost). */
      notificationUrl: string | null;
    },
  ) {}

  get mode() {
    return this.cfg.mode;
  }
  get publicKey() {
    return this.cfg.publicKey;
  }

  async payWithCard(req: Parameters<PaymentGateway["payWithCard"]>[0]) {
    const { card } = req;
    const amount = (req.amountCents / 100).toFixed(2);
    const body = {
      type: "online",
      processing_mode: "automatic",
      total_amount: amount,
      external_reference: req.orderId,
      payer: {
        email: card.payer.email,
        identification: card.payer.identification ?? undefined,
      },
      transactions: {
        payments: [
          {
            amount,
            payment_method: {
              id: card.paymentMethodId,
              type: card.method === "debito" ? "debit_card" : "credit_card",
              token: card.token,
              installments: card.installments,
              statement_descriptor: "MINIGALU",
            },
          },
        ],
      },
    };
    // un pago rechazado responde 402 con la orden adentro: no es un error de la integración
    const order = await this.call<MpOrder | { data: MpOrder }>("/v1/orders", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "X-Idempotency-Key": req.idempotencyKey },
      accept: [402],
    });
    return fromOrder("data" in order ? order.data : order);
  }

  async walletPreference(req: Parameters<PaymentGateway["walletPreference"]>[0]) {
    const https = req.backUrl.startsWith("https://");
    const body = {
      items: [
        { id: req.orderId, title: req.title, quantity: 1, unit_price: req.amountCents / 100, currency_id: "ARS" },
      ],
      payer: { email: req.email },
      external_reference: req.orderId,
      purpose: "wallet_purchase",
      back_urls: { success: req.backUrl, pending: req.backUrl, failure: req.backUrl },
      // auto_return exige back_urls https
      auto_return: https ? "approved" : undefined,
      notification_url: this.cfg.notificationUrl ?? undefined,
      statement_descriptor: "MINIGALU",
    };
    // cambió el total (cupón): se actualiza la misma preferencia para no rearmar el Brick (probado en el sandbox)
    if (req.preferenceId) {
      const path = `/checkout/preferences/${encodeURIComponent(req.preferenceId)}`;
      const current = await this.call<{ external_reference: string | null }>(path).catch(() => null);
      if (current?.external_reference === req.orderId) {
        await this.call(path, { method: "PUT", body: JSON.stringify(body) });
        return { preferenceId: req.preferenceId, redirectUrl: null };
      }
    }
    const pref = await this.call<{ id: string }>("/checkout/preferences", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return { preferenceId: pref.id, redirectUrl: null };
  }

  /** Ids de la API de Orders empiezan con ORD; los de dinero en cuenta son números (API de Payments). */
  async fetch(id: string) {
    try {
      return id.startsWith("ORD")
        ? fromOrder(await this.call<MpOrder>(`/v1/orders/${encodeURIComponent(id)}`))
        : fromPayment(await this.call<MpPayment>(`/v1/payments/${encodeURIComponent(id)}`));
    } catch (e) {
      if (e instanceof MercadoPagoError && e.status === 404) return null;
      throw e;
    }
  }

  /**
   * Planes de cuotas de la cuenta para Visa y Mastercard (todos los bancos). Sin interés = el máximo de cuotas con
   * tasa 0 que comparten TODOS los emisores, para que la promesa valga con cualquier tarjeta.
   */
  async installments(amountCents: number) {
    type Plan = { payer_costs: { installments: number; installment_rate: number }[] };
    const amount = (amountCents / 100).toFixed(2);
    const plans = (
      await Promise.all(
        ["visa", "master"].map((pm) =>
          this.call<Plan[]>(`/v1/payment_methods/installments?amount=${amount}&payment_method_id=${pm}`).catch(
            () => [] as Plan[],
          ),
        ),
      )
    ).flat();
    if (!plans.length) return { interestFree: 1, max: 1 };
    const freeUpTo = (p: Plan) =>
      Math.max(1, ...p.payer_costs.filter((c) => c.installment_rate === 0).map((c) => c.installments));
    return {
      interestFree: Math.min(...plans.map(freeUpTo)),
      max: Math.max(...plans.flatMap((p) => p.payer_costs.map((c) => c.installments))),
    };
  }

  /** x-signature: "ts=…,v1=…"; v1 = HMAC-SHA256(secret, "id:{data.id};request-id:{x-request-id};ts:{ts};"). */
  verifyWebhook(n: { dataId: string; requestId: string; signature: string }) {
    if (!this.cfg.webhookSecret) return false;
    const parts = Object.fromEntries(
      n.signature.split(",").map((kv) => kv.split("=").map((x) => x.trim()) as [string, string]),
    );
    if (!parts.ts || !parts.v1) return false;
    const id = /^[a-z0-9]+$/i.test(n.dataId) ? n.dataId.toLowerCase() : n.dataId;
    const manifest = `id:${id};${n.requestId ? `request-id:${n.requestId};` : ""}ts:${parts.ts};`;
    const expected = createHmac("sha256", this.cfg.webhookSecret).update(manifest).digest("hex");
    const a = Buffer.from(expected);
    const b = Buffer.from(parts.v1);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  private async call<T>(path: string, { accept = [], ...init }: RequestInit & { accept?: number[] } = {}): Promise<T> {
    const res = await fetch(`${API}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.cfg.accessToken}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
    });
    if (!res.ok && !accept.includes(res.status))
      throw new MercadoPagoError(res.status, await res.text().catch(() => ""));
    return (await res.json()) as T;
  }
}

export class MercadoPagoError extends Error {
  constructor(
    readonly status: number,
    body: string,
  ) {
    super(`Mercado Pago respondió ${status}: ${body.slice(0, 300)}`);
  }
}

function fromOrder(o: MpOrder): GatewayPayment {
  const p = o.transactions?.payments?.[0];
  return {
    id: o.id,
    // el detalle útil (rejected_by_issuer, insufficient_amount…) está en el pago, no en la orden
    status: p?.status ?? o.status,
    statusDetail: p?.status_detail ?? o.status_detail,
    method: (p?.payment_method?.type && METHOD[p.payment_method.type]) || null,
    installments: p?.payment_method?.installments ?? null,
    // total_paid_amount viene lleno aunque el pago falle: se usa el monto pedido
    amountCents: Math.round(Number(p?.amount ?? o.total_amount) * 100),
    orderId: o.external_reference,
    raw: o,
  };
}

function fromPayment(p: MpPayment): GatewayPayment {
  return {
    id: String(p.id),
    status: p.status,
    statusDetail: p.status_detail,
    method: (p.payment_type_id && METHOD[p.payment_type_id]) || null,
    installments: p.installments,
    amountCents: Math.round(p.transaction_amount * 100),
    orderId: p.external_reference,
    raw: p,
  };
}

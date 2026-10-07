import { createHmac, timingSafeEqual } from "node:crypto";
import type { PaymentMethod } from "@mini-galu/contracts";
import type { GatewayPayment, PaymentGateway } from "../application/ports";

const API = "https://api.mercadopago.com";

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
 * Mercado Pago (API REST v1). Pagos con tarjeta desde el token del Payment Brick, preferencias para
 * "dinero en cuenta" y consulta de pagos para el webhook. Credenciales de prueba o de producción según `mode`.
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
    const body = {
      transaction_amount: req.amountCents / 100,
      token: card.token,
      description: req.description,
      installments: card.installments,
      payment_method_id: card.paymentMethodId,
      issuer_id: card.issuerId ? Number(card.issuerId) : undefined,
      payer: {
        email: card.payer.email,
        identification: card.payer.identification ?? undefined,
      },
      external_reference: req.orderId,
      statement_descriptor: "MINIGALU",
      notification_url: this.cfg.notificationUrl ?? undefined,
    };
    const p = await this.call<MpPayment>("/v1/payments", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "X-Idempotency-Key": req.idempotencyKey },
    });
    return toPayment(p);
  }

  async walletPreference(req: Parameters<PaymentGateway["walletPreference"]>[0]) {
    const https = req.backUrl.startsWith("https://");
    const pref = await this.call<{ id: string; init_point: string; sandbox_init_point: string }>(
      "/checkout/preferences",
      {
        method: "POST",
        body: JSON.stringify({
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
        }),
      },
    );
    return { preferenceId: pref.id, redirectUrl: null };
  }

  async fetch(id: string) {
    try {
      return toPayment(await this.call<MpPayment>(`/v1/payments/${encodeURIComponent(id)}`));
    } catch (e) {
      if (e instanceof MercadoPagoError && e.status === 404) return null;
      throw e;
    }
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

  private async call<T>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await fetch(`${API}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.cfg.accessToken}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
    });
    if (!res.ok) throw new MercadoPagoError(res.status, await res.text().catch(() => ""));
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

function toPayment(p: MpPayment): GatewayPayment {
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

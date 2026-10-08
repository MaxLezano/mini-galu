import type { CardPaymentInputSchema, PaymentMethod, PaymentSettings, WalletPreference } from "@mini-galu/contracts";
import type { z } from "zod";

export type CardPayment = z.output<typeof CardPaymentInputSchema>;

/** Un pago tal como lo informa el proveedor. */
export type GatewayPayment = {
  id: string;
  /** approved, pending, in_process, rejected, cancelled, refunded… (los de Mercado Pago). */
  status: string;
  statusDetail: string | null;
  method: PaymentMethod | null;
  installments: number | null;
  amountCents: number;
  /** external_reference = id del pedido. */
  orderId: string | null;
  raw: unknown;
};

/**
 * Puerto de cobros. `MercadoPagoGateway` (Payment Brick + API de pagos) o `SimulatedGateway` (local sin cuenta:
 * reproduce las reglas de las tarjetas de prueba de Mercado Pago con el nombre del titular: APRO, OTHE, CONT…).
 */
export interface PaymentGateway {
  readonly kind: "mercadopago" | "simulado";
  readonly mode: "prueba" | "produccion" | "simulado";
  readonly publicKey: string | null;
  payWithCard(req: {
    orderId: string;
    idempotencyKey: string;
    amountCents: number;
    description: string;
    card: CardPayment;
  }): Promise<GatewayPayment>;
  /**
   * Dinero en cuenta: preferencia para que el Brick lleve a Mercado Pago y vuelva a `backUrl`.
   * Con `preferenceId` actualiza esa misma (cambió el total por un cupón) si es de este pedido.
   */
  walletPreference(req: {
    preferenceId?: string | null;
    orderId: string;
    amountCents: number;
    title: string;
    email: string;
    backUrl: string;
  }): Promise<WalletPreference>;
  fetch(paymentId: string): Promise<GatewayPayment | null>;
  /** Firma `x-signature` del webhook. */
  verifyWebhook(n: { dataId: string; requestId: string; signature: string }): boolean;
}

export interface PaymentRepository {
  /** Guarda o actualiza el intento (idempotente por proveedor + id). */
  record(orderId: string, provider: string, p: GatewayPayment): Promise<void>;
}

export interface PaymentSettingsStore {
  get(): Promise<PaymentSettings>;
  save(s: PaymentSettings): Promise<void>;
}

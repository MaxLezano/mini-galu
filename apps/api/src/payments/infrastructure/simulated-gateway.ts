import type { CardPlans } from "@mini-galu/contracts";
import type { GatewayPayment, PaymentGateway } from "../application/ports";

/**
 * Cobros de mentira para desarrollo local y tests (sin cuenta de Mercado Pago).
 * Igual que las tarjetas de prueba de Mercado Pago, el resultado lo decide el nombre del titular:
 * APRO (o cualquier otro) aprueba · OTHE rechaza · CONT queda pendiente · FUND sin saldo · SECU código inválido.
 */
export class SimulatedGateway implements PaymentGateway {
  readonly kind = "simulado" as const;
  readonly mode = "simulado" as const;
  readonly publicKey = null;
  private payments = new Map<string, GatewayPayment>();
  private byKey = new Map<string, string>();
  private seq = 1;

  async payWithCard(req: Parameters<PaymentGateway["payWithCard"]>[0]) {
    const repeated = this.byKey.get(req.idempotencyKey);
    if (repeated) return this.payments.get(repeated) as GatewayPayment;
    const holder = (req.card.holderName ?? "APRO").trim().toUpperCase();
    const [status, statusDetail] =
      holder === "OTHE"
        ? ["rejected", "cc_rejected_other_reason"]
        : holder === "CONT"
          ? ["in_process", "pending_contingency"]
          : holder === "FUND"
            ? ["rejected", "cc_rejected_insufficient_amount"]
            : holder === "SECU"
              ? ["rejected", "cc_rejected_bad_filled_security_code"]
              : ["approved", "accredited"];
    const p = this.create({
      status,
      statusDetail,
      method: req.card.method,
      installments: req.card.installments,
      amountCents: req.amountCents,
      orderId: req.orderId,
    });
    this.byKey.set(req.idempotencyKey, p.id);
    return p;
  }

  /** Simula ir a Mercado Pago, pagar con el saldo y volver: devuelve la URL de vuelta con el pago aprobado. */
  async walletPreference(req: Parameters<PaymentGateway["walletPreference"]>[0]) {
    const p = this.create({
      status: "approved",
      statusDetail: "accredited",
      method: "dinero_cuenta",
      installments: 1,
      amountCents: req.amountCents,
      orderId: req.orderId,
    });
    return { preferenceId: null, redirectUrl: `${req.backUrl}&payment_id=${p.id}&status=approved` };
  }

  async fetch(id: string) {
    return this.payments.get(id) ?? null;
  }

  /** Sin cuenta no hay promociones: nunca se prometen cuotas sin interés. */
  async installments() {
    return { interestFree: 1, max: 12 };
  }

  /** Sin cuenta no hay tasas reales: no se muestra un plan inventado. */
  async cardPlans(): Promise<CardPlans> {
    return { brand: null, debit: false, plans: [] };
  }

  verifyWebhook() {
    return false;
  }

  private create(p: Omit<GatewayPayment, "id" | "raw">) {
    const payment = { ...p, id: `sim-${this.seq++}`, raw: { simulated: true } };
    this.payments.set(payment.id, payment);
    return payment;
  }
}

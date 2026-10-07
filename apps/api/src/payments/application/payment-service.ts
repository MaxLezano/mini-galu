import type { AdminPayments, CheckoutConfig, PaymentSettings, PayResult, WalletPreference } from "@mini-galu/contracts";
import type { OrderPayments } from "../../orders/application/order-payments";
import { ConflictError, NotFoundError, UnauthorizedError, ValidationError } from "../../shared/domain/errors";
import type { EventBus } from "../../shared/events/event-bus";
import { messageFor, outcomeOf } from "../domain/outcome";
import type { CardPayment, GatewayPayment, PaymentGateway, PaymentRepository, PaymentSettingsStore } from "./ports";

export class PaymentService {
  constructor(
    private readonly gateway: PaymentGateway,
    private readonly payments: PaymentRepository,
    private readonly settings: PaymentSettingsStore,
    private readonly orders: OrderPayments,
    private readonly events: EventBus,
    private readonly urls: { web: string; webhook: string },
  ) {}

  async config(): Promise<CheckoutConfig> {
    const s = await this.settings.get();
    return {
      gateway: this.gateway.kind,
      publicKey: this.gateway.publicKey,
      mode: this.gateway.mode,
      methods: { credito: s.credito, debito: s.debito, dinero_cuenta: s.dinero_cuenta },
      maxInstallments: s.maxInstallments,
    };
  }

  /** Tarjeta de crédito o débito (token del Brick). */
  async payCard(number: string, token: string, card: CardPayment): Promise<PayResult> {
    const s = await this.settings.get();
    if (!s[card.method]) throw new ValidationError("Ese medio de pago no está disponible");
    const installments = card.method === "debito" ? 1 : card.installments;
    if (installments > s.maxInstallments) throw new ValidationError(`Hasta ${s.maxInstallments} cuotas`);
    const order = await this.orders.payable(number, token);
    let p: GatewayPayment;
    try {
      p = await this.gateway.payWithCard({
        orderId: order.id,
        // el token de la tarjeta es de un solo uso: mismo token = mismo intento
        idempotencyKey: `${order.id}:${card.token}`,
        amountCents: order.totalCents,
        description: order.title,
        card: { ...card, installments },
      });
    } catch (e) {
      console.error("[pagos] no se pudo cobrar:", e);
      return { outcome: "rejected", message: "No pudimos procesar el pago. Probá de nuevo en un momento." };
    }
    await this.apply(p);
    const outcome = outcomeOf(p.status);
    return { outcome, message: messageFor(outcome, p.statusDetail) };
  }

  /** Dinero en cuenta de Mercado Pago: el Brick redirige con esta preferencia. */
  async wallet(number: string, token: string): Promise<WalletPreference> {
    if (!(await this.settings.get()).dinero_cuenta) throw new ValidationError("Ese medio de pago no está disponible");
    const order = await this.orders.payable(number, token);
    const back = `${this.urls.web}/checkout?pedido=${encodeURIComponent(order.number)}&t=${encodeURIComponent(token)}`;
    return this.gateway.walletPreference({
      orderId: order.id,
      amountCents: order.totalCents,
      title: order.title,
      email: order.email,
      backUrl: back,
    });
  }

  /**
   * Aviso de Mercado Pago (`/payments/webhook`). Se valida la firma y el estado se consulta a Mercado Pago:
   * nunca se confía en lo que viene en el cuerpo.
   */
  async webhook(n: { type: string | null; dataId: string | null; requestId: string; signature: string }) {
    if (!n.dataId || !this.gateway.verifyWebhook({ dataId: n.dataId, requestId: n.requestId, signature: n.signature }))
      throw new UnauthorizedError("Firma inválida");
    // "order": tarjetas (API de Orders) · "payment": dinero en cuenta (preferencia)
    if (n.type && n.type !== "payment" && n.type !== "order") return;
    await this.sync(n.dataId);
  }

  /** Al volver de Mercado Pago (`?payment_id=`): si el webhook no llegó (local sin túnel), se consulta igual. */
  async syncReturn(number: string, token: string, paymentId: string) {
    const order = await this.orders.owned(number, token);
    const p = await this.gateway.fetch(paymentId);
    if (!p || p.orderId !== order.id) throw new NotFoundError("No encontramos ese pago");
    await this.apply(p);
  }

  private async sync(paymentId: string) {
    const p = await this.gateway.fetch(paymentId);
    if (p) await this.apply(p);
  }

  private async apply(p: GatewayPayment) {
    if (!p.orderId) return;
    const order = await this.orders.findById(p.orderId);
    if (!order) return;
    await this.payments.record(order.id, this.gateway.kind, p);
    if (outcomeOf(p.status) !== "approved") return;
    if (p.amountCents !== order.totalCents) {
      await this.events.publish({
        type: "PaymentAmountMismatch",
        occurredAt: new Date(),
        payload: { orderId: order.id, paid: p.amountCents, expected: order.totalCents, paymentId: p.id },
      });
      return;
    }
    await this.orders.approved(order.id, { method: p.method, installments: p.installments });
  }

  /* --------------------------------------------------------------- panel */

  async admin(): Promise<AdminPayments> {
    return {
      settings: await this.settings.get(),
      gateway: this.gateway.kind,
      mode: this.gateway.mode,
      webhookUrl: this.urls.webhook,
    };
  }

  async saveSettings(s: PaymentSettings): Promise<AdminPayments> {
    if (!s.credito && !s.debito && !s.dinero_cuenta) throw new ConflictError("Dejá al menos un medio de pago activo");
    await this.settings.save(s);
    return this.admin();
  }
}

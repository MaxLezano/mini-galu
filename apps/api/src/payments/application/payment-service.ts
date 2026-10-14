import type {
  AdminPayments,
  CardPlans,
  CheckoutConfig,
  InstallmentPlan,
  PaymentSettings,
  PayResult,
  WalletPreference,
} from "@mini-galu/contracts";
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

  private plans = new Map<number, { plan: InstallmentPlan; at: number }>();

  /**
   * Cuotas por monto (en centavos), consultadas a Mercado Pago y guardadas 1 hora. Se aplica el tope de cuotas
   * del panel: nunca se muestran más cuotas de las que la tienda ofrece en el checkout.
   */
  async installments(amounts: number[]): Promise<Record<number, InstallmentPlan>> {
    const s = await this.settings.get();
    const cap = s.credito ? s.maxInstallments : 1;
    const out: Record<number, InstallmentPlan> = {};
    await Promise.all(
      [...new Set(amounts)].map(async (amount) => {
        const hit = this.plans.get(amount);
        let plan = hit && Date.now() - hit.at < 3_600_000 ? hit.plan : null;
        if (!plan) {
          plan = await this.gateway.installments(amount);
          this.plans.set(amount, { plan, at: Date.now() });
        }
        out[amount] = { interestFree: Math.min(plan.interestFree, cap), max: Math.min(plan.max, cap) };
      }),
    );
    return out;
  }

  /** Planes de la tarjeta que se está cargando, para el total del pedido y con el tope de cuotas del panel. */
  async cardPlans(number: string, token: string, bin: string): Promise<CardPlans> {
    const order = await this.orders.payable(number, token);
    const s = await this.settings.get();
    const r = await this.gateway.cardPlans(order.totalCents, bin);
    const cap = r.debit || !s.credito ? 1 : s.maxInstallments;
    return { ...r, plans: r.plans.filter((p) => p.installments <= cap) };
  }

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
  async wallet(number: string, token: string, preferenceId: string | null = null): Promise<WalletPreference> {
    if (!(await this.settings.get()).dinero_cuenta) throw new ValidationError("Ese medio de pago no está disponible");
    const order = await this.orders.payable(number, token);
    return this.gateway.walletPreference({
      preferenceId,
      orderId: order.id,
      amountCents: order.totalCents,
      title: order.title,
      email: order.email,
      backUrl: this.urls.web + order.returnPath,
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

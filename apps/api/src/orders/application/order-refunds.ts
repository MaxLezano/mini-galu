import { type AdminRefund, formatARS, type OrderStatus } from "@mini-galu/contracts";
import { ConflictError, NotFoundError } from "../../shared/domain/errors";
import type { EventBus } from "../../shared/events/event-bus";
import { formatOrderNumber, parseOrderNumber } from "../domain/order";
import { refundDetail, refundPlan } from "../domain/refund";
import type { AdminOrderRepository, OrderPayment, OrderRecord, RefundGiftcards } from "./ports";

/** Un reintegro en curso: lo arma `prepare` y lo cierra `complete` (o lo deshace `abort`). */
export type RefundTicket = {
  orderId: string;
  number: string;
  from: OrderStatus;
  kind: "prendas" | "giftcard";
  plan: AdminRefund;
  /** La operación de Mercado Pago a la que se le devuelve la plata (null si no hay plata que devolver o fue efectivo). */
  payment: OrderPayment | null;
};

/**
 * Lo que el módulo de pagos puede hacer para reintegrar un pedido desde el panel: ver qué se devuelve, apartarlo
 * (la gift card comprada se anula antes de devolver la plata, para que no se use mientras tanto) y cerrarlo.
 */
export class OrderRefunds {
  constructor(
    private readonly orders: AdminOrderRepository,
    private readonly giftcards: RefundGiftcards,
    private readonly events: EventBus,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  /** Qué se devolvería (para el detalle del pedido). */
  async plan(o: OrderRecord, payment: OrderPayment | null): Promise<AdminRefund | null> {
    const plan = refundPlan(o, !!payment);
    if (plan && !plan.blocked && o.kind === "giftcard" && (await this.giftcards.purchasedUsed(o.id)))
      return { ...plan, blocked: "La gift card ya se usó: no se puede devolver la plata" };
    return plan;
  }

  async prepare(number: string): Promise<RefundTicket> {
    const n = parseOrderNumber(number);
    const o = n ? await this.orders.findByNumber(n) : null;
    if (!o) throw new NotFoundError("No existe ese pedido");
    if (o.status === "reembolsado") throw new ConflictError("Este pedido ya se reintegró");
    const payment = await this.orders.approvedPayment(o.id);
    const plan = await this.plan(o, payment);
    if (!plan) throw new ConflictError("Este pedido no tiene un pago para reintegrar");
    if (plan.blocked) throw new ConflictError(plan.blocked);
    if (o.kind === "giftcard" && !(await this.giftcards.annulPurchased(o.id)))
      throw new ConflictError("La gift card ya se usó: no se puede devolver la plata");
    return {
      orderId: o.id,
      number: formatOrderNumber(o.number),
      from: o.status,
      kind: o.kind,
      plan,
      payment: plan.cents > 0 && !plan.cash ? payment : null,
    };
  }

  /** Mercado Pago no devolvió la plata: la gift card comprada vuelve a valer. */
  async abort(t: RefundTicket): Promise<void> {
    if (t.kind === "giftcard") await this.giftcards.reactivatePurchased(t.orderId);
  }

  /** La plata ya volvió (o está en proceso): el pedido pasa a reembolsado y se avisa al cliente. */
  async complete(
    t: RefundTicket,
    r: { restock: boolean; reason: string; pending: boolean },
  ): Promise<{ giftcardCents: number }> {
    const at = this.clock();
    const restock = r.restock && t.plan.restock;
    if (!(await this.orders.markRefunded(t.orderId, t.from, at, restock)))
      throw new ConflictError("Alguien cambió este pedido recién: actualizá la página");
    const giftcardCents = t.kind === "prendas" ? await this.giftcards.restoreRedeemed(t.orderId) : 0;
    await this.orders.addEvent(t.orderId, {
      kind: "refunded",
      title: "Pago reintegrado",
      detail:
        refundDetail(
          {
            cents: t.plan.cents,
            cash: t.plan.cash,
            giftcardCents,
            restocked: restock,
            pending: r.pending,
            reason: r.reason,
          },
          formatARS,
        ) || null,
      auto: false,
      toStatus: "reembolsado",
    });
    await this.events.publish({
      type: "OrderRefunded",
      occurredAt: at,
      payload: {
        orderId: t.orderId,
        number: t.number,
        kind: t.kind,
        cents: t.plan.cents,
        cash: t.plan.cash,
        giftcardCents,
        pending: r.pending,
      },
    });
    return { giftcardCents };
  }
}

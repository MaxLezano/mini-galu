import { type AdminRefund, type AdminReturn, formatARS, type OrderStatus } from "@mini-galu/contracts";
import { ConflictError, NotFoundError } from "../../shared/domain/errors";
import type { EventBus } from "../../shared/events/event-bus";
import { formatOrderNumber, parseOrderNumber } from "../domain/order";
import {
  type ReturnedLine,
  type ReturnPick,
  refundDetail,
  refundPlan,
  remainingLines,
  returnPlan,
  returnQuote,
} from "../domain/refund";
import type { AdminOrderRepository, ItemsReturn, OrderPayment, OrderRecord, RefundGiftcards } from "./ports";

/** Un reintegro en curso: lo arma `prepare` y lo cierra `complete` (o lo deshace `abort`). */
export type RefundTicket = {
  orderId: string;
  number: string;
  from: OrderStatus;
  kind: "prendas" | "giftcard";
  plan: AdminRefund;
  /** La operación de Mercado Pago a la que se le devuelve la plata (null si no hay plata que devolver o fue efectivo). */
  payment: OrderPayment | null;
  /** Hubo devoluciones parciales antes: a Mercado Pago se le pide lo que queda y la nota de crédito lleva lo que queda. */
  partialBefore: boolean;
  /** Renglones de la nota de crédito (null: anula la factura entera). */
  lines: ReturnedLine[] | null;
};

/** Una devolución parcial en curso: `prepareReturn` la aparta, `completeReturn` la cierra y `abortReturn` la deshace. */
export type ReturnTicket = {
  orderId: string;
  number: string;
  /** Identifica la devolución (la nota de crédito y el reintegro de Mercado Pago). */
  key: string;
  cash: boolean;
  payment: OrderPayment | null;
  reserved: ItemsReturn;
  items: { itemId: string; name: string; size: string; qty: number }[];
  lines: ReturnedLine[];
};

/**
 * Lo que el módulo de pagos puede hacer para reintegrar un pedido desde el panel: ver qué se devuelve, apartarlo
 * (la gift card comprada se anula antes de devolver la plata, para que no se use mientras tanto) y cerrarlo. También
 * la devolución de algunas prendas, que se aparta igual antes de devolver su parte.
 */
export class OrderRefunds {
  constructor(
    private readonly orders: AdminOrderRepository,
    private readonly giftcards: RefundGiftcards,
    private readonly events: EventBus,
    private readonly clock: () => Date = () => new Date(),
    private readonly newKey: () => string = () => crypto.randomUUID(),
  ) {}

  /** Qué se devolvería (para el detalle del pedido). */
  async plan(o: OrderRecord, payment: OrderPayment | null): Promise<AdminRefund | null> {
    const plan = refundPlan(o, !!payment);
    if (plan && !plan.blocked && o.kind === "giftcard" && (await this.giftcards.purchasedUsed(o.id)))
      return { ...plan, blocked: "La gift card ya se usó: no se puede devolver la plata" };
    return plan;
  }

  /** Si se pueden devolver algunas prendas (para el detalle del pedido). */
  returns(o: OrderRecord, payment: OrderPayment | null): AdminReturn | null {
    return returnPlan(o, !!payment);
  }

  async prepare(number: string): Promise<RefundTicket> {
    const o = await this.find(number);
    if (o.status === "reembolsado") throw new ConflictError("Este pedido ya se reintegró");
    const payment = await this.orders.approvedPayment(o.id);
    const plan = await this.plan(o, payment);
    if (!plan) throw new ConflictError("Este pedido no tiene un pago para reintegrar");
    if (plan.blocked) throw new ConflictError(plan.blocked);
    if (o.kind === "giftcard" && !(await this.giftcards.annulPurchased(o.id)))
      throw new ConflictError("La gift card ya se usó: no se puede devolver la plata");
    const partialBefore = o.refundedCents > 0 || o.giftcardRefundedCents > 0 || o.items.some((i) => i.returnedQty > 0);
    return {
      orderId: o.id,
      number: formatOrderNumber(o.number),
      from: o.status,
      kind: o.kind,
      plan,
      payment: plan.cents > 0 && !plan.cash ? payment : null,
      partialBefore,
      lines: partialBefore ? remainingLines(o, plan.cents + plan.giftcardCents) : null,
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
      title: t.partialBefore ? "Reintegrado lo que quedaba" : "Pago reintegrado",
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
        lines: t.lines,
      },
    });
    return { giftcardCents };
  }

  /** Aparta la devolución de esas prendas (nadie más puede devolverlas) antes de devolver la plata. */
  async prepareReturn(number: string, picks: ReturnPick[]): Promise<ReturnTicket> {
    const o = await this.find(number);
    const payment = await this.orders.approvedPayment(o.id);
    const plan = this.returns(o, payment);
    if (!plan) throw new ConflictError("De este pedido no se pueden devolver prendas");
    if (plan.blocked) throw new ConflictError(plan.blocked);
    const q = returnQuote(o, picks);
    if ("error" in q) throw new ConflictError(q.error);
    const reserved: ItemsReturn = {
      items: q.items.map((i) => ({ itemId: i.id, qty: i.take })),
      cents: q.cents,
      giftcardCents: q.giftcardCents,
    };
    if (!(await this.orders.reserveReturn(o.id, o.status, reserved)))
      throw new ConflictError("Alguien cambió este pedido recién: actualizá la página");
    return {
      orderId: o.id,
      number: formatOrderNumber(o.number),
      key: this.newKey(),
      cash: plan.cash,
      payment: q.cents > 0 && !plan.cash ? payment : null,
      reserved,
      items: q.items.map((i) => ({ itemId: i.id, name: i.name, size: i.size, qty: i.take })),
      lines: q.lines,
    };
  }

  /** Mercado Pago no devolvió la plata: las prendas vuelven a contar como vendidas. */
  async abortReturn(t: ReturnTicket): Promise<void> {
    await this.orders.undoReturn(t.orderId, t.reserved);
  }

  /** La plata ya volvió: la gift card recupera su parte, las prendas vuelven al stock si se eligió y se avisa. */
  async completeReturn(
    t: ReturnTicket,
    r: { restock: boolean; reason: string; pending: boolean },
  ): Promise<{ giftcardCents: number }> {
    const at = this.clock();
    if (r.restock) await this.orders.restockItems(t.orderId, t.reserved.items);
    const giftcardCents =
      t.reserved.giftcardCents > 0 ? await this.giftcards.restoreRedeemed(t.orderId, t.reserved.giftcardCents) : 0;
    await this.orders.addEvent(t.orderId, {
      kind: "returned",
      title: "Devolución de prendas",
      detail: refundDetail(
        {
          cents: t.reserved.cents,
          cash: t.cash,
          giftcardCents,
          restocked: r.restock,
          pending: r.pending,
          reason: r.reason,
          items: t.items,
        },
        formatARS,
      ),
      auto: false,
    });
    await this.events.publish({
      type: "OrderItemsReturned",
      occurredAt: at,
      payload: {
        orderId: t.orderId,
        number: t.number,
        key: t.key,
        items: t.items.map(({ name, size, qty }) => ({ name, size, qty })),
        cents: t.reserved.cents,
        cash: t.cash,
        giftcardCents,
        pending: r.pending,
        lines: t.lines,
      },
    });
    return { giftcardCents };
  }

  private async find(number: string): Promise<OrderRecord> {
    const n = parseOrderNumber(number);
    const o = n ? await this.orders.findByNumber(n) : null;
    if (!o) throw new NotFoundError("No existe ese pedido");
    return o;
  }
}

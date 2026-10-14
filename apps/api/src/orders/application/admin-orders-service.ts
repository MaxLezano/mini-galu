import type { AdminDaySummary, AdminOrderDetail, AdminOrderSummary, OrderStatus } from "@mini-galu/contracts";
import { ConflictError, NotFoundError } from "../../shared/domain/errors";
import type { EventBus } from "../../shared/events/event-bus";
import type { ImageStorage } from "../../shared/media/image-storage";
import { canMove, nextStatus, statusTitle } from "../domain/flow";
import { formatOrderNumber, parseOrderNumber } from "../domain/order";
import { monthKpis, monthlySales, monthStart, weeklySales } from "../domain/stats";
import type { AdminOrderRepository, OrderRecord } from "./ports";

/** Panel del taller: tablero de pedidos, detalle, mover de estado y notas (admin-pedidos.html). */
export class AdminOrdersService {
  constructor(
    private readonly orders: AdminOrderRepository,
    private readonly storage: ImageStorage,
    private readonly events: EventBus,
    /** "2026-10-08T10-13" → "Jue 8 · 10 a 13 h" (lo sabe el módulo de envíos). */
    private readonly pickupLabel: (slot: string) => string | null,
    /** Página de la tienda donde se paga un pedido (número + token). */
    private readonly payUrl: (number: string, token: string) => string,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async list(): Promise<AdminOrderSummary[]> {
    return (await this.orders.listForBoard()).map((o) => this.card(o));
  }

  async detail(number: string): Promise<AdminOrderDetail> {
    const o = await this.find(number);
    const [events, payment] = await Promise.all([this.orders.events(o.id), this.orders.approvedPayment(o.id)]);
    return {
      ...this.card(o),
      email: o.email,
      phone: o.phone,
      whatsappOptIn: o.whatsappOptIn,
      shippingAddress: o.shippingAddress,
      pickupLabel: o.pickupSlot ? this.pickupLabel(o.pickupSlot) : null,
      subtotalCents: o.subtotalCents,
      discountCents: o.discountCents,
      shippingCents: o.shippingCents,
      couponCode: o.couponCode,
      paidAt: o.paidAt?.toISOString() ?? null,
      reservedUntil: o.reservedUntil?.toISOString() ?? null,
      internalNote: o.internalNote,
      payUrl:
        o.status === "esperando_pago" && o.channel !== "web"
          ? this.payUrl(formatOrderNumber(o.number), o.accessToken)
          : null,
      payment,
      events: events.map((e) => ({ ...e, at: e.at.toISOString() })),
    };
  }

  /** Mover a otro estado (arrastrar en el tablero o el botón del siguiente paso). */
  async move(number: string, to: OrderStatus): Promise<AdminOrderDetail> {
    const o = await this.find(number);
    const from = o.status;
    const why = canMove(from, to, o.shippingMethod);
    if (why) throw new ConflictError(why);
    const at = this.clock();
    if (!(await this.orders.setStatus(o.id, from, to, at)))
      throw new ConflictError("Alguien cambió este pedido recién: actualizá la página");
    await this.orders.addEvent(o.id, {
      kind: "status",
      title: statusTitle(to, o.shippingMethod),
      detail: null,
      auto: false,
    });
    // TODO(fase 6 · automations): avisar al cliente (listo para retirar, despachado, entregado…)
    await this.events.publish({
      type: "OrderStatusChanged",
      occurredAt: at,
      payload: { orderId: o.id, number: formatOrderNumber(o.number), from, to },
    });
    return this.detail(number);
  }

  /** Avanzar varios pedidos a su siguiente paso (acciones en lote). Los que no pueden avanzar se informan. */
  async advance(numbers: string[]): Promise<{ moved: string[]; skipped: { number: string; reason: string }[] }> {
    const moved: string[] = [];
    const skipped: { number: string; reason: string }[] = [];
    for (const number of numbers) {
      try {
        const o = await this.find(number);
        const to = nextStatus(o.status, o.shippingMethod);
        if (!to) {
          skipped.push({ number, reason: "No tiene un siguiente paso" });
          continue;
        }
        await this.move(number, to);
        moved.push(formatOrderNumber(o.number));
      } catch (e) {
        skipped.push({ number, reason: e instanceof Error ? e.message : "No se pudo mover" });
      }
    }
    return { moved, skipped };
  }

  /** Resumen del día (admin.html): qué hay que hacer, cómo vienen las ventas y lo que se hizo solo. */
  async summary(): Promise<AdminDaySummary> {
    const now = this.clock();
    const [board, paid, feed] = await Promise.all([
      this.orders.listForBoard(),
      this.orders.paidSince(monthStart(now, -11)),
      this.orders.recentAutoEvents(6),
    ]);
    const thisMonth = paid.filter((o) => o.paidAt >= monthStart(now));
    const earlier = await this.orders.buyersBefore(monthStart(now), [...new Set(thisMonth.map((o) => o.email))]);
    const count = (f: (o: OrderRecord) => boolean) => board.filter(f).length;
    const series = (list: { start: Date; cents: number }[]) =>
      list.map((p) => ({ start: p.start.toISOString(), cents: p.cents }));
    return {
      todo: {
        toPrepare: count((o) => o.status === "nuevo" || o.status === "preparando"),
        toShip: count((o) => o.status === "listo" && o.shippingMethod !== "taller"),
        toPickup: count((o) => o.status === "listo" && o.shippingMethod === "taller"),
        awaitingPayment: count((o) => o.status === "esperando_pago"),
      },
      month: monthKpis(paid, now, earlier),
      weeks: series(weeklySales(paid, now)),
      months: series(monthlySales(paid, now)),
      recent: [...board]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 6)
        .map((o) => this.card(o)),
      feed: feed.map((e) => ({
        number: formatOrderNumber(e.orderNumber),
        customer: e.customer,
        kind: e.kind,
        title: e.title,
        detail: e.detail,
        at: e.at.toISOString(),
      })),
    };
  }

  async saveNote(number: string, note: string): Promise<void> {
    const o = await this.find(number);
    await this.orders.setNote(o.id, note.trim() || null);
  }

  private async find(number: string): Promise<OrderRecord> {
    const n = parseOrderNumber(number);
    const o = n ? await this.orders.findByNumber(n) : null;
    if (!o) throw new NotFoundError("No existe ese pedido");
    return o;
  }

  private card(o: OrderRecord): AdminOrderSummary {
    return {
      number: formatOrderNumber(o.number),
      status: o.status,
      channel: o.channel,
      createdAt: o.createdAt.toISOString(),
      statusChangedAt: o.statusChangedAt.toISOString(),
      customer: {
        name: `${o.firstName} ${o.lastName}`.trim(),
        city: o.shippingAddress?.city ?? (o.shippingMethod === "taller" ? null : o.province),
      },
      units: o.items.reduce((a, i) => a + i.qty, 0),
      totalCents: o.totalCents,
      shippingMethod: o.shippingMethod,
      paymentMethod: o.paymentMethod,
      installments: o.installments,
      items: o.items.map((i) => ({
        slug: i.productSlug,
        name: i.name,
        size: i.size,
        qty: i.qty,
        imageUrl: i.imagePath ? this.storage.url(i.imagePath) : "",
        unitPriceCents: i.unitPriceCents,
      })),
    };
  }
}

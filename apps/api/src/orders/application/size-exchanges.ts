import type { AdminExchange, ExchangeInputSchema } from "@mini-galu/contracts";
import type { z } from "zod";
import { ConflictError, NotFoundError } from "../../shared/domain/errors";
import type { EventBus } from "../../shared/events/event-bus";
import { exchangeBlocked, exchangeDetail } from "../domain/exchange";
import { formatOrderNumber, PAID_STATUSES, parseOrderNumber } from "../domain/order";
import { NOT_SHIPPED } from "../domain/refund";
import type { AdminOrderRepository, OrderRecord } from "./ports";

type Input = z.output<typeof ExchangeInputSchema>;

/**
 * Cambio de talle desde el detalle del pedido (el cliente lo pide por WhatsApp o mail, como dice la ayuda de cambios):
 * el talle nuevo sale del stock y el devuelto vuelve, en la misma transacción. Mismo modelo, mismo precio: no se
 * cobra ni se devuelve plata y la factura no cambia. Queda en el historial y le llega un mail al cliente.
 */
export class SizeExchanges {
  constructor(
    private readonly orders: AdminOrderRepository,
    private readonly events: EventBus,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  /** Qué talles se pueden elegir para cada prenda (null si el pedido no admite cambios). */
  async options(o: OrderRecord): Promise<AdminExchange | null> {
    if (o.kind !== "prendas" || !PAID_STATUSES.includes(o.status) || !o.items.length) return null;
    const sizes = await this.orders.sizesOf([...new Set(o.items.map((i) => i.productSlug))]);
    return {
      restockSuggested: NOT_SHIPPED.includes(o.status),
      items: o.items
        .filter((i) => i.qty > i.returnedQty)
        .map((i) => ({
          itemId: i.id,
          sizes: sizes
            .filter((s) => s.slug === i.productSlug && s.size !== i.size)
            .map(({ size, stock }) => ({ size, stock })),
        })),
    };
  }

  async exchange(number: string, input: Input): Promise<void> {
    const n = parseOrderNumber(number);
    const o = n ? await this.orders.findByNumber(n) : null;
    if (!o) throw new NotFoundError("No existe ese pedido");
    const item = o.items.find((i) => i.id === input.itemId) ?? null;
    const to = item ? (await this.orders.sizesOf([item.productSlug])).find((s) => s.size === input.size) : undefined;
    const why = exchangeBlocked(o, item, to ?? null, input.qty);
    if (why || !item || !to) throw new ConflictError(why ?? "No se pudo cambiar el talle");
    const restock = input.restock && !!item.variantId;
    const { name, size: from } = item;
    if (
      !(await this.orders.exchangeSize(o.id, {
        itemId: item.id,
        toVariantId: to.variantId,
        toSize: to.size,
        qty: input.qty,
        restock,
      }))
    )
      throw new ConflictError("Alguien cambió este pedido o se vendió ese talle recién: actualizá la página");
    await this.orders.addEvent(o.id, {
      kind: "exchange",
      title: "Cambio de talle",
      detail: exchangeDetail({
        name,
        from,
        to: to.size,
        qty: input.qty,
        restocked: restock,
        reason: input.reason,
      }),
      auto: false,
    });
    await this.events.publish({
      type: "OrderSizeExchanged",
      occurredAt: this.clock(),
      payload: {
        orderId: o.id,
        number: formatOrderNumber(o.number),
        name,
        from,
        to: to.size,
        qty: input.qty,
        shipped: !NOT_SHIPPED.includes(o.status),
      },
    });
  }
}

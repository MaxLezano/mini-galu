import type { RevocationReceipt } from "@mini-galu/contracts";
import { ConflictError, NotFoundError } from "../../shared/domain/errors";
import type { EventBus } from "../../shared/events/event-bus";
import { formatOrderNumber, parseOrderNumber } from "../domain/order";
import { revocationBlocked, revocationCode, revocationInTime } from "../domain/revocation";
import type { OrderRepository, Revocation, RevocationStore } from "./ports";

/**
 * Botón de arrepentimiento (Res. SCI 424/2020): sin cuenta, con el número de pedido y el mail de la compra.
 * Registra la solicitud, le da un código al cliente (en pantalla y por mail) y le avisa al taller.
 * La devolución de la plata la hace el taller desde el pedido.
 */
export class Revocations {
  constructor(
    private readonly orders: Pick<OrderRepository, "findByNumber" | "addEvent">,
    private readonly store: RevocationStore,
    private readonly events: EventBus,
    private readonly clock: () => Date = () => new Date(),
    private readonly random: () => number = Math.random,
  ) {}

  async request(input: { order: string; email: string; reason: string }): Promise<RevocationReceipt> {
    const n = parseOrderNumber(input.order);
    const o = n === null ? null : await this.orders.findByNumber(n);
    // mismo mensaje si no existe o si el mail no coincide: no se puede averiguar de quién es un pedido
    if (!o || o.email.trim().toLowerCase() !== input.email.trim().toLowerCase())
      throw new NotFoundError("No encontramos un pedido con ese número y ese mail");
    const blocked = revocationBlocked(o.status);
    if (blocked) throw new ConflictError(blocked);

    const number = formatOrderNumber(o.number);
    const before = await this.store.forOrder(o.id);
    if (before) return receipt(number, before, true);

    const now = this.clock();
    const { created, revocation } = await this.store.save(o.id, {
      code: revocationCode(this.random),
      inTime: revocationInTime(o, now),
      reason: input.reason.trim() || null,
    });
    if (!created) return receipt(number, revocation, true);

    await this.orders.addEvent(o.id, {
      kind: "revocation",
      title: "Pidió la baja con el botón de arrepentimiento",
      detail: [
        `Código ${revocation.code}`,
        revocation.inTime ? null : `pasaron más de 10 días desde la entrega`,
        revocation.reason ? `"${revocation.reason}"` : null,
      ]
        .filter(Boolean)
        .join(" · "),
      auto: true,
    });
    await this.events.publish({
      type: "RevocationRequested",
      occurredAt: now,
      payload: {
        orderId: o.id,
        number,
        code: revocation.code,
        email: o.email,
        firstName: o.firstName,
        customer: `${o.firstName} ${o.lastName}`.trim(),
        inTime: revocation.inTime,
        reason: revocation.reason,
      },
    });
    return receipt(number, revocation, false);
  }
}

const receipt = (order: string, r: Revocation, repeated: boolean): RevocationReceipt => ({
  code: r.code,
  order,
  requestedAt: r.at.toISOString(),
  inTime: r.inTime,
  repeated,
});

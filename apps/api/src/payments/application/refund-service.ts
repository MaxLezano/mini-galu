import type { RefundInputSchema, RefundResult, ReturnInputSchema } from "@mini-galu/contracts";
import type { z } from "zod";
import type { OrderRefunds } from "../../orders/application/order-refunds";
import { ConflictError } from "../../shared/domain/errors";
import { type PaymentGateway, type PaymentRepository, RefundRejected } from "./ports";

type Input = z.output<typeof RefundInputSchema>;
type ReturnInput = z.output<typeof ReturnInputSchema>;

/**
 * Reintegro desde el panel (detalle del pedido): devuelve el total por Mercado Pago, por el mismo medio con que se
 * pagó, y recién con la plata devuelta el pedido pasa a reembolsado (la gift card usada recupera su saldo y, si se
 * elige, las prendas vuelven al stock). Nunca se marca reembolsado sin que Mercado Pago haya aceptado la devolución.
 * Una venta del taller cobrada en efectivo se devuelve en mano: no pasa por Mercado Pago.
 *
 * La devolución de algunas prendas devuelve solo su parte (menos su parte del cupón; lo pagado con gift card vuelve a
 * su saldo en la misma proporción) y el pedido sigue como estaba. Las prendas se apartan antes de pedirle la plata a
 * Mercado Pago, así dos clics no las devuelven dos veces; si Mercado Pago no la devuelve, se liberan.
 */
export class RefundService {
  constructor(
    private readonly gateway: PaymentGateway,
    private readonly payments: PaymentRepository,
    private readonly orders: OrderRefunds,
    private readonly newKey: () => string = () => crypto.randomUUID(),
  ) {}

  async refund(number: string, input: Input): Promise<RefundResult> {
    const t = await this.orders.prepare(number);
    let pending = false;
    if (t.payment) {
      try {
        // una clave por intento: si uno falló (sin saldo), el siguiente no repite la respuesta guardada;
        // un doble reintegro lo frena Mercado Pago (ya devuelto) y el cambio de estado condicionado
        ({ pending } = await this.gateway.refund({
          paymentId: t.payment.reference,
          idempotencyKey: `${t.orderId}:${this.newKey()}`,
          // después de una devolución parcial se pide lo que queda (no el total)
          ...(t.partialBefore ? { amountCents: t.plan.cents } : {}),
        }));
      } catch (e) {
        await this.orders.abort(t);
        throw new ConflictError(e instanceof RefundRejected ? e.message : "No se pudo hacer el reintegro");
      }
      await this.payments.markRefunded(t.payment.provider, t.payment.reference);
    }
    const { giftcardCents } = await this.orders.complete(t, { ...input, pending });
    // sin operación de Mercado Pago solo vuelve plata si fue en efectivo (lo demás lo frena el plan)
    return { cents: t.payment || t.plan.cash ? t.plan.cents : 0, giftcardCents, pending };
  }

  async returnItems(number: string, input: ReturnInput): Promise<RefundResult> {
    const t = await this.orders.prepareReturn(number, input.items);
    let pending = false;
    if (t.payment) {
      try {
        ({ pending } = await this.gateway.refund({
          paymentId: t.payment.reference,
          idempotencyKey: `${t.orderId}:${t.key}`,
          amountCents: t.reserved.cents,
        }));
      } catch (e) {
        await this.orders.abortReturn(t);
        throw new ConflictError(e instanceof RefundRejected ? e.message : "No se pudo hacer el reintegro");
      }
    }
    const { giftcardCents } = await this.orders.completeReturn(t, { ...input, pending });
    return { cents: t.payment || t.cash ? t.reserved.cents : 0, giftcardCents, pending };
  }
}

import { type MailLinks, paymentApprovedMail } from "../domain/mail";
import type { Mailer, MailOrders } from "./ports";

/**
 * Avisos al cliente por mail. Hoy: "Recibimos tu pago" (evento PaymentApproved, que sale una sola vez por pedido).
 * TODO(fase 6 · automations): resto de los avisos, WhatsApp, registro y reglas activables desde el panel.
 */
export class OrderNotifications {
  constructor(
    private readonly orders: MailOrders,
    private readonly mailer: Mailer,
    private readonly links: (orderNumber: string) => MailLinks,
  ) {}

  async paymentApproved(orderId: string): Promise<boolean> {
    const o = await this.orders.find(orderId);
    if (!o) return false;
    await this.mailer.send(paymentApprovedMail(o, this.links(o.number)));
    return true;
  }
}

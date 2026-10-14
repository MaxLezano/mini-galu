import { type MailLinks, paymentApprovedMail, paymentReminderMail, type ReminderOrder } from "../domain/mail";
import type { Mailer, MailOrders } from "./ports";

/**
 * Avisos al cliente por mail: "Recibimos tu pago" (PaymentApproved) y el recordatorio de un link de pago sin pagar
 * (PaymentLinkReminder). Cada evento sale una sola vez por pedido.
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

  async paymentReminder(o: ReminderOrder): Promise<void> {
    await this.mailer.send(paymentReminderMail(o, this.links(o.number)));
  }
}

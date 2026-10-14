import {
  type MailLinks,
  type MessageMail,
  messageMail,
  paymentApprovedMail,
  paymentReminderMail,
  type ReminderOrder,
} from "../domain/mail";
import type { Mailer, MailOrders } from "./ports";

/**
 * Mails al cliente. Cuándo sale cada uno y con qué texto lo deciden las automatizaciones (reglas del panel).
 * TODO(fase 6 · automations): WhatsApp Business cuando estén las credenciales de Meta.
 */
export class OrderNotifications {
  constructor(
    private readonly orders: MailOrders,
    private readonly mailer: Mailer,
    private readonly links: (orderNumber: string) => MailLinks,
  ) {}

  /** "Recibimos tu pago" con el detalle del pedido. Devuelve a quién se mandó (null si no existe el pedido). */
  async paymentApproved(orderId: string, intro?: string): Promise<string | null> {
    const o = await this.orders.find(orderId);
    if (!o) return null;
    await this.mailer.send(paymentApprovedMail(o, this.links(o.number), intro));
    return o.email;
  }

  async paymentReminder(o: ReminderOrder, intro?: string): Promise<void> {
    await this.mailer.send(paymentReminderMail(o, this.links(o.number), intro));
  }

  async message(m: MessageMail): Promise<void> {
    await this.mailer.send(messageMail(m, this.links(m.number ?? "")));
  }
}

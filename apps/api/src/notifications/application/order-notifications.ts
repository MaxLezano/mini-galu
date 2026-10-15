import {
  type GiftcardMailData,
  giftcardBuyerMail,
  giftcardMail,
  letterMail,
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
    private readonly links: (orderNumber: string) => Promise<MailLinks>,
  ) {}

  /** "Recibimos tu pago" con el detalle del pedido. Devuelve a quién se mandó (null si no existe el pedido). */
  async paymentApproved(orderId: string, intro?: string): Promise<string | null> {
    const o = await this.orders.find(orderId);
    if (!o) return null;
    await this.mailer.send(paymentApprovedMail(o, await this.links(o.number), intro));
    return o.email;
  }

  async paymentReminder(o: ReminderOrder, intro?: string): Promise<void> {
    await this.mailer.send(paymentReminderMail(o, await this.links(o.number), intro));
  }

  async message(m: MessageMail): Promise<void> {
    await this.mailer.send(messageMail(m, await this.links(m.number ?? "")));
  }

  /* ---- Gift cards ---- */

  async giftcard(to: string, g: GiftcardMailData): Promise<void> {
    await this.mailer.send(giftcardMail(to, g, await this.links("")));
  }

  async giftcardBuyer(to: string, g: GiftcardMailData, delivery: Parameters<typeof giftcardBuyerMail>[2]) {
    await this.mailer.send(giftcardBuyerMail(to, g, delivery, await this.links("")));
  }

  /* ---- Cartas del taller ---- */

  async welcome(to: string, unsubscribeUrl: string): Promise<void> {
    await this.mailer.send(
      letterMail(
        {
          to,
          subject: "Te sumaste a las Cartas del taller ♡",
          body: "Gracias por sumarte. Una vez por mes te contamos lo que se viene: lanzamientos antes que en Instagram, telas nuevas y lo que estamos cosiendo en el taller.",
          unsubscribeUrl,
        },
        await this.links(""),
      ),
    );
  }

  async letter(m: { to: string; subject: string; body: string; unsubscribeUrl: string }): Promise<void> {
    await this.mailer.send(letterMail(m, await this.links("")));
  }
}

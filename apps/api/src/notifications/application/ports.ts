import type { Mail, MailOrder } from "../domain/mail";

/** Puerto de envío de mails. Local: SMTP a Mailpit (http://localhost:8025). Prod: Resend (RESEND_API_KEY). */
export interface Mailer {
  send(mail: Mail): Promise<void>;
}

/** Cada mail sale con el email de la tienda como respuesta (si el cliente contesta, le llega a Gaby). */
export function withReplyTo(mailer: Mailer, replyTo: () => Promise<string>): Mailer {
  return { send: async (mail) => mailer.send({ ...mail, replyTo: mail.replyTo ?? (await replyTo()) }) };
}

/** El pedido como lo necesita el mail (lo arma la composición desde el módulo de pedidos). */
export interface MailOrders {
  find(orderId: string): Promise<MailOrder | null>;
}

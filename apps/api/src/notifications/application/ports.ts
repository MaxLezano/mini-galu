import type { Mail, MailOrder } from "../domain/mail";

/** Puerto de envío de mails. Local: SMTP a Mailpit (http://localhost:8025). Prod: Resend (RESEND_API_KEY). */
export interface Mailer {
  send(mail: Mail): Promise<void>;
}

/** El pedido como lo necesita el mail (lo arma la composición desde el módulo de pedidos). */
export interface MailOrders {
  find(orderId: string): Promise<MailOrder | null>;
}

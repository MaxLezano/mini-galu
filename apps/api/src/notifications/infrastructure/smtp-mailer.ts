import { createTransport, type Transporter } from "nodemailer";
import type { Mailer } from "../application/ports";
import type { Mail } from "../domain/mail";

/** SMTP: en local, Mailpit (puerto 1025, sin usuario) y los mails se ven en http://localhost:8025. */
export class SmtpMailer implements Mailer {
  private readonly transport: Transporter;
  private readonly from: string;

  constructor(cfg: { host: string; port: number; from: string; user?: string; pass?: string }) {
    this.from = cfg.from;
    this.transport = createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.port === 465,
      auth: cfg.user ? { user: cfg.user, pass: cfg.pass ?? "" } : undefined,
    });
  }

  async send(mail: Mail) {
    await this.transport.sendMail({
      from: this.from,
      to: mail.to,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      replyTo: mail.replyTo,
    });
  }
}

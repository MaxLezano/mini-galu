import type { Mailer } from "../application/ports";
import type { Mail } from "../domain/mail";

export class MemoryMailer implements Mailer {
  sent: Mail[] = [];
  async send(mail: Mail) {
    this.sent.push(mail);
  }
}

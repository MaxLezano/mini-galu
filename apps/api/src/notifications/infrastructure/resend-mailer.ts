import type { Mailer } from "../application/ports";
import type { Mail } from "../domain/mail";

const API = "https://api.resend.com/emails";
const ATTEMPTS = 3;

/** Mails en producción por la API HTTP de Resend (el dominio se verifica en resend.com → Domains). */
export class ResendMailer implements Mailer {
  constructor(
    private readonly cfg: { apiKey: string; from: string },
    private readonly sleep = (ms: number) => new Promise((r) => setTimeout(r, ms)),
  ) {}

  async send(mail: Mail) {
    const body = JSON.stringify({
      from: this.cfg.from,
      to: [mail.to],
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    });
    for (let attempt = 1; ; attempt++) {
      const res = await fetch(API, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.cfg.apiKey}`, "Content-Type": "application/json" },
        body,
      });
      if (res.ok) return;
      // 429: límite por segundo (las cartas salen en serie); 5xx: falla de Resend. El resto no mejora reintentando.
      const retriable = res.status === 429 || res.status >= 500;
      if (!retriable || attempt === ATTEMPTS) throw new Error(`Resend ${res.status}: ${await errorMessage(res)}`);
      const wait = Number(res.headers.get("retry-after"));
      await this.sleep(wait > 0 ? wait * 1000 : 1000 * attempt);
    }
  }
}

async function errorMessage(res: Response): Promise<string> {
  const text = await res.text().catch(() => "");
  try {
    return (JSON.parse(text) as { message?: string }).message ?? text;
  } catch {
    return text;
  }
}

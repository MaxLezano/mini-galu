import { randomBytes } from "node:crypto";
import type { AdminNewsletter, LetterInput } from "@mini-galu/contracts";
import { NotFoundError } from "../../shared/domain/errors";
import type { LetterMailer, LetterRepository, SubscriberRepository } from "./ports";

/**
 * "Cartas del taller": suscripción desde la tienda (con mail de bienvenida y baja en un clic) y cartas que Gaby
 * escribe en el panel y salen a todos los suscriptos.
 */
export class NewsletterService {
  constructor(
    private readonly subscribers: SubscriberRepository,
    private readonly letters: LetterRepository,
    private readonly mailer: LetterMailer,
    /** Página de baja de la tienda (con el token). */
    private readonly unsubscribeUrl: (token: string) => string,
    private readonly clock: () => Date = () => new Date(),
    private readonly newToken: () => string = () => randomBytes(18).toString("base64url"),
  ) {}

  /** Siempre responde igual (no revela si el mail ya estaba). */
  async subscribe(email: string, source: string): Promise<void> {
    const found = await this.subscribers.findByEmail(email);
    if (found && !found.unsubscribedAt) return;
    const s = found ?? (await this.subscribers.create({ email, source, token: this.newToken() }));
    if (found) await this.subscribers.resubscribe(found.id);
    // si el mail de bienvenida falla, la suscripción igual queda (las cartas salen después)
    await this.mailer.welcome(email, this.unsubscribeUrl(s.token)).catch((e) => {
      console.warn("[cartas] no salió la bienvenida:", e instanceof Error ? e.message : e);
    });
  }

  async unsubscribe(token: string): Promise<void> {
    if (!(await this.subscribers.unsubscribe(token, this.clock())))
      throw new NotFoundError("Ese link de baja no existe");
  }

  async admin(): Promise<AdminNewsletter> {
    const [subscribers, letters] = await Promise.all([this.subscribers.countActive(), this.letters.recent(10)]);
    return {
      subscribers,
      letters: letters.map((l) => ({
        id: l.id,
        subject: l.subject,
        recipients: l.recipients,
        sentAt: l.sentAt?.toISOString() ?? null,
        createdAt: l.createdAt.toISOString(),
      })),
    };
  }

  /** CSV de suscriptos activos (para importarlos en otra herramienta si hace falta). */
  async csv(): Promise<string> {
    const rows = await this.subscribers.active();
    return ["email,desde", ...rows.map((s) => `${s.email},${s.createdAt.toISOString().slice(0, 10)}`)].join("\n");
  }

  async sendTest(letter: LetterInput, to: string) {
    await this.mailer.letter({ to, subject: `[Prueba] ${letter.subject}`, body: letter.body, unsubscribeUrl: "#" });
  }

  /**
   * Manda la carta a todos los suscriptos activos, de a uno (el proveedor de mails limita el ritmo). Devuelve a
   * cuántos les va a llegar; el envío sigue en segundo plano y la carta queda marcada al terminar.
   */
  async send(letter: LetterInput, wait = false): Promise<{ recipients: number }> {
    const list = await this.subscribers.active();
    const saved = await this.letters.create(letter);
    const run = async () => {
      let n = 0;
      for (const s of list) {
        try {
          await this.mailer.letter({
            to: s.email,
            subject: letter.subject,
            body: letter.body,
            unsubscribeUrl: this.unsubscribeUrl(s.token),
          });
          n++;
        } catch (e) {
          console.warn("[cartas] no se pudo mandar a un suscripto:", e instanceof Error ? e.message : e);
        }
      }
      await this.letters.markSent(saved.id, n, this.clock());
    };
    if (wait) await run();
    else void run();
    return { recipients: list.length };
  }
}

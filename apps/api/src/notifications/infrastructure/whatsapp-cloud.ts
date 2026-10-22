import type { WhatsApp } from "../../automations/application/ports";
import type { Mailer } from "../application/ports";
import { escapeHtml } from "../domain/mail";

const VERSION = "v26.0";

type Message = Parameters<WhatsApp["send"]>[0];

export type WhatsAppConfig = {
  /** Token permanente de un usuario del sistema (Meta Business → Usuarios del sistema), con whatsapp_business_messaging. */
  token: string;
  /** "Identificador del número de teléfono" (WhatsApp → Configuración de la API), no el número. */
  phoneNumberId: string;
  /** Plantillas aprobadas por Meta (ver "Avisos por WhatsApp" en DEPLOY.md). */
  templates: { pedido: string; novedad: string };
  language: string;
};

/** Meta no acepta saltos de línea, tabulaciones ni más de 4 espacios seguidos dentro de una variable. */
export const templateText = (s: string) => s.replace(/\s+/g, " ").trim();

/** Las variables de cada plantilla, en orden: "pedido" ({{1}} número, {{2}} mensaje) y "novedad" ({{1}} mensaje). */
export const templateParams = (m: Message) => (m.kind === "pedido" ? [m.number, m.body] : [m.body]).map(templateText);

/**
 * WhatsApp Business Cloud API: cada aviso es una plantilla aprobada con el texto de la regla adentro. Que Meta acepte
 * el mensaje no quiere decir que llegue (un número sin WhatsApp falla después): por eso el mail sale siempre.
 */
export class CloudWhatsApp implements WhatsApp {
  readonly mode = "conectado";

  constructor(
    private readonly config: WhatsAppConfig,
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  async send(m: Message) {
    const res = await this.fetcher(`https://graph.facebook.com/${VERSION}/${this.config.phoneNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.config.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: m.to.replace(/\D/g, ""),
        type: "template",
        template: {
          name: this.config.templates[m.kind],
          language: { code: this.config.language },
          components: [{ type: "body", parameters: templateParams(m).map((text) => ({ type: "text", text })) }],
        },
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (res.ok) return;
    const body = (await res.json().catch(() => null)) as {
      error?: { code?: number; message?: string; error_data?: { details?: string } };
    } | null;
    const e = body?.error;
    throw new Error(
      e ? `(#${e.code}) ${e.error_data?.details ?? e.message ?? "error"}` : `WhatsApp ${res.status}: sin respuesta`,
    );
  }
}

/**
 * Local y CI: lo que saldría por WhatsApp llega a Mailpit (http://localhost:8025) a "<número>@whatsapp.simulado",
 * con el texto como lo vería el cliente dentro de la plantilla.
 */
export class FakeWhatsApp implements WhatsApp {
  readonly mode = "simulado";

  constructor(private readonly mailer: Mailer) {}

  async send(m: Message) {
    const text = templateParams(m).at(-1) ?? "";
    await this.mailer.send({
      to: `${m.to.replace(/\D/g, "")}@whatsapp.simulado`,
      subject: `WhatsApp (simulado) · ${m.kind === "pedido" ? `pedido #${m.number}` : "novedad"}`,
      text,
      html: `<p style="font-family:sans-serif;white-space:pre-wrap">${escapeHtml(text)}</p>`,
    });
  }
}

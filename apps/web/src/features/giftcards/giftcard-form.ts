import {
  GIFTCARD_MAX_CENTS,
  GIFTCARD_MIN_CENTS,
  type GiftcardDesign,
  type GiftcardPurchase,
  GiftcardPurchaseSchema,
} from "@mini-galu/contracts";

/** Lo que va cargando el cliente en el armado (giftcards.html → #armala). */
export type GiftcardForm = {
  design: GiftcardDesign;
  /** Monto en pesos (chips o "otro monto"). */
  amount: number;
  /** El "otro monto" tal como se escribe ("12.500"); vacío si eligió un chip. */
  other: string;
  toName: string;
  fromName: string;
  message: string;
  via: "whatsapp" | "mail";
  recipient: string;
  /** "ahora" o una fecha "YYYY-MM-DD". */
  when: "ahora" | "fecha";
  day: string;
  buyer: { email: string; firstName: string; lastName: string; phone: string };
};

export const EMPTY_GIFTCARD: GiftcardForm = {
  design: "cacao",
  amount: 20_000,
  other: "",
  toName: "",
  fromName: "",
  message: "",
  via: "whatsapp",
  recipient: "",
  when: "ahora",
  day: "",
  buyer: { email: "", firstName: "", lastName: "", phone: "" },
};

/** "12500" o "12.500" → "12.500" (y el monto en pesos). */
export function otherAmount(input: string): { text: string; amount: number } {
  const n = Number(input.replace(/\D/g, "").slice(0, 7));
  return { text: n ? n.toLocaleString("es-AR") : "", amount: n || 0 };
}

/** "Por WhatsApp · se la mandás vos" / "Por mail · el 20 de octubre a las 9". */
export function deliveryLabel(f: GiftcardForm, dayLabel: (day: string) => string): string {
  if (f.via === "whatsapp") return "Por WhatsApp · se la mandás vos";
  return `Por mail · ${f.when === "ahora" || !f.day ? "ahora mismo" : `el ${dayLabel(f.day)} a las 9`}`;
}

/** Lo que se manda a la API, o el primer error para mostrar. */
export function toPurchase(f: GiftcardForm): { ok: true; value: GiftcardPurchase } | { ok: false; error: string } {
  const cents = f.amount * 100;
  if (cents < GIFTCARD_MIN_CENTS) return { ok: false, error: "El monto mínimo es $5.000" };
  if (cents > GIFTCARD_MAX_CENTS) return { ok: false, error: "El monto máximo es $500.000" };
  const scheduled = f.via === "mail" && f.when === "fecha";
  if (scheduled && !f.day) return { ok: false, error: "Elegí el día en que le llega" };
  const value: GiftcardPurchase = {
    design: f.design,
    amountCents: cents,
    toName: f.toName.trim(),
    fromName: f.fromName.trim(),
    message: f.message.trim() || null,
    via: f.via,
    recipient: f.recipient.trim(),
    // por WhatsApp la manda quien la compra, cuando quiera
    deliverOn: scheduled ? f.day : null,
    buyer: { ...f.buyer, whatsappOptIn: false },
  };
  const r = GiftcardPurchaseSchema.safeParse(value);
  return r.success ? { ok: true, value } : { ok: false, error: r.error.issues[0]?.message ?? "Revisá los datos" };
}

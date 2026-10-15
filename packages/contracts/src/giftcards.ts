import { z } from "zod";
import { CheckoutContactSchema, toE164AR } from "./checkout";
import type { Cents } from "./money";

/** Diseños de la tarjeta (giftcards.html → .designs). */
export const GIFTCARD_DESIGNS = { cacao: "Cacao", rosa: "Rosa", salvia: "Salvia", lino: "Lino" } as const;
export type GiftcardDesign = keyof typeof GIFTCARD_DESIGNS;

/** Montos sugeridos (en pesos) y límites de "otro monto". */
export const GIFTCARD_AMOUNTS = [10_000, 20_000, 35_000, 50_000] as const;
export const GIFTCARD_MIN_CENTS: Cents = 5_000_00;
export const GIFTCARD_MAX_CENTS: Cents = 500_000_00;

export const GiftcardPurchaseSchema = z
  .object({
    design: z.enum(Object.keys(GIFTCARD_DESIGNS) as [GiftcardDesign, ...GiftcardDesign[]]),
    amountCents: z
      .number()
      .int()
      .min(GIFTCARD_MIN_CENTS, "El monto mínimo es $5.000")
      .max(GIFTCARD_MAX_CENTS, "El monto máximo es $500.000"),
    toName: z.string().trim().min(1, "Poné para quién es").max(24),
    fromName: z.string().trim().min(1, "Poné de parte de quién").max(30),
    message: z.string().trim().max(180).nullable(),
    via: z.enum(["whatsapp", "mail"]),
    /** WhatsApp o mail de quien la recibe. */
    recipient: z.string().trim().min(3, "Poné a dónde se la mandamos").max(120),
    /** "YYYY-MM-DD": ese día a las 9 (null: apenas se paga). */
    deliverOn: z.iso.date().nullable(),
    /** Quien la compra (para el comprobante y el pago). */
    buyer: CheckoutContactSchema,
  })
  .superRefine((g, ctx) => {
    if (g.via === "mail" && !z.email().safeParse(g.recipient).success)
      ctx.addIssue({ code: "custom", path: ["recipient"], message: "Revisá el mail de quien la recibe" });
    if (g.via === "whatsapp" && !toE164AR(g.recipient))
      ctx.addIssue({
        code: "custom",
        path: ["recipient"],
        message: "Escribí el WhatsApp con característica (ej. 11 5555-1234)",
      });
  });
export type GiftcardPurchase = z.input<typeof GiftcardPurchaseSchema>;

export type GiftcardCreated = { number: string; accessToken: string; totalCents: Cents };

/** Consulta de saldo (pública, con el código). */
export type GiftcardBalance = { code: string; balanceCents: Cents; expiresAt: string; usable: boolean; toName: string };

/** Lo que muestra el pago de una gift card (página /pagar). */
export type GiftcardSummary = {
  design: GiftcardDesign;
  amountCents: Cents;
  toName: string;
  fromName: string;
  message: string | null;
  via: "whatsapp" | "mail";
  deliverOn: string | null;
};

/** Gift cards de la cuenta: las que compró y las que recibió en su mail. */
export type AccountGiftcard = {
  code: string | null;
  amountCents: Cents;
  balanceCents: Cents;
  toName: string;
  status: "esperando_pago" | "activa" | "anulada";
  expiresAt: string | null;
  mine: "compre" | "recibi";
};

/** Gift cards en el panel (admin-tienda.html): vendidas, saldo sin usar y cada tarjeta activa. */
export type AdminGiftcards = {
  sold: number;
  soldCents: Cents;
  unusedCents: Cents;
  cards: {
    code: string;
    toName: string;
    fromName: string;
    amountCents: Cents;
    balanceCents: Cents;
    expiresAt: string;
    expired: boolean;
  }[];
};

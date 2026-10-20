import type { PaymentLinkInput, Size } from "@mini-galu/contracts";
import {
  type ContactForm,
  contactError,
  type ShippingForm,
  shippingError,
  toShippingInput,
} from "../../checkout/checkout-form";

export type LinkChannel = PaymentLinkInput["channel"];
/** Cómo paga una venta del taller: con el link de Mercado Pago o en efectivo en el momento. */
export type LinkPayment = NonNullable<PaymentLinkInput["payment"]>;

export type LinkLine = { slug: string; name: string; size: Size; qty: number; priceCents: number; imageUrl: string };

/** Suma una prenda (o más unidades del mismo talle) sin pasarse del stock. */
export function addLine(lines: LinkLine[], line: LinkLine, stock: number): LinkLine[] {
  const same = lines.find((l) => l.slug === line.slug && l.size === line.size);
  if (!same) return [...lines, { ...line, qty: Math.min(line.qty, stock) }];
  return lines.map((l) => (l === same ? { ...l, qty: Math.min(l.qty + line.qty, stock) } : l));
}

export const linesSubtotal = (lines: LinkLine[]) => lines.reduce((a, l) => a + l.priceCents * l.qty, 0);

/** Primer error del formulario (prendas, cliente, entrega) con el campo para enfocarlo. En el taller no hay entrega. */
export function linkError(
  channel: LinkChannel,
  lines: LinkLine[],
  contact: ContactForm,
  shipping: ShippingForm,
): { field: string; message: string } | null {
  if (!lines.length) return { field: "product", message: "Agregá al menos una prenda" };
  return contactError(contact) ?? (channel === "taller" ? null : shippingError(shipping));
}

export function toLinkInput(
  channel: LinkChannel,
  lines: LinkLine[],
  contact: ContactForm,
  shipping: ShippingForm,
  giftcardCode = "",
  payment: LinkPayment = "link",
): PaymentLinkInput {
  return {
    channel,
    // el efectivo solo existe en el taller: si se cambió de canal después de elegirlo, va por link
    payment: channel === "taller" ? payment : "link",
    contact,
    shipping: channel === "taller" ? null : toShippingInput(shipping),
    items: lines.map(({ slug, size, qty }) => ({ slug, size, qty })),
    giftcardCode: giftcardCode.trim() || null,
  };
}

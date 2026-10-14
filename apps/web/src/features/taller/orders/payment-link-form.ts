import type { PaymentLinkInput, Size } from "@mini-galu/contracts";
import {
  type ContactForm,
  contactError,
  type ShippingForm,
  shippingError,
  toShippingInput,
} from "../../checkout/checkout-form";

export type LinkChannel = PaymentLinkInput["channel"];

export type LinkLine = { slug: string; name: string; size: Size; qty: number; priceCents: number; imageUrl: string };

/** Suma una prenda (o más unidades del mismo talle) sin pasarse del stock. */
export function addLine(lines: LinkLine[], line: LinkLine, stock: number): LinkLine[] {
  const same = lines.find((l) => l.slug === line.slug && l.size === line.size);
  if (!same) return [...lines, { ...line, qty: Math.min(line.qty, stock) }];
  return lines.map((l) => (l === same ? { ...l, qty: Math.min(l.qty + line.qty, stock) } : l));
}

export const linesSubtotal = (lines: LinkLine[]) => lines.reduce((a, l) => a + l.priceCents * l.qty, 0);

/** Primer error del formulario (prendas, cliente, entrega) con el campo para enfocarlo. */
export function linkError(
  lines: LinkLine[],
  contact: ContactForm,
  shipping: ShippingForm,
): { field: string; message: string } | null {
  if (!lines.length) return { field: "product", message: "Agregá al menos una prenda" };
  return contactError(contact) ?? shippingError(shipping);
}

export function toLinkInput(
  channel: LinkChannel,
  lines: LinkLine[],
  contact: ContactForm,
  shipping: ShippingForm,
): PaymentLinkInput {
  return {
    channel,
    contact,
    shipping: toShippingInput(shipping),
    items: lines.map(({ slug, size, qty }) => ({ slug, size, qty })),
  };
}

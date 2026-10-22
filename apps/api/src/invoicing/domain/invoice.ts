import {
  formatARSExact,
  INVOICE_KINDS,
  type InvoiceKind,
  type InvoiceStatus,
  PAYMENT_METHODS,
  type PaymentMethod,
} from "@mini-galu/contracts";

/** Códigos de comprobante de ARCA (Gaby es monotributista: factura y nota de crédito "C", sin IVA discriminado). */
export const CBTE_TYPE: Record<InvoiceKind, number> = { factura: 11, nota_credito: 13 };

/** Lo que se imprime en el comprobante, congelado al crearlo. */
export type InvoiceData = {
  orderNumber: string;
  issuer: { name: string; cuit: string; address: string; iibb: string; activitiesSince: string };
  receptor: { name: string; email: string };
  lines: InvoiceLine[];
  /** "Tarjeta de crédito · 3 cuotas" */
  payment: string | null;
};
export type InvoiceLine = { description: string; qty: number; unitCents: number; totalCents: number };

export type Invoice = {
  id: string;
  orderId: string;
  kind: InvoiceKind;
  status: InvoiceStatus;
  cbteType: number;
  pointOfSale: number;
  number: number | null;
  cae: string | null;
  caeExpiresOn: string | null;
  issuedOn: string | null;
  totalCents: number;
  data: InvoiceData;
  associatedId: string | null;
  simulated: boolean;
  attempts: number;
  lastError: string | null;
  nextAttemptAt: Date | null;
  mailedAt: Date | null;
  createdAt: Date;
};

/** El pedido como lo necesita la factura (lo arma la composición desde el módulo de pedidos). */
export type InvoiceOrder = {
  id: string;
  number: string;
  kind: "prendas" | "giftcard";
  firstName: string;
  lastName: string;
  email: string;
  items: { name: string; size: string; qty: number; unitPriceCents: number }[];
  discountCents: number;
  couponCode: string | null;
  shippingCents: number;
  /** Lo que se cobró (sin lo pagado con gift card). */
  totalCents: number;
  /** Lo pagado con gift card: es un medio de pago, la venta se factura igual. */
  giftcardCents: number;
  /** "Tarjeta de crédito · 3 cuotas" */
  payment: string | null;
};

/**
 * Se factura la venta de prendas por el total del pedido (la gift card es un medio de pago más). La compra de una
 * gift card no se factura: es un vale, la venta se factura cuando se canjea. Un pedido en $0 no lleva factura.
 */
export const invoiceable = (o: InvoiceOrder) => o.kind === "prendas" && invoiceTotal(o) > 0;

/** Total de la venta: lo cobrado más lo pagado con gift card (antes se facturaba solo lo cobrado). */
export const invoiceTotal = (o: InvoiceOrder) => o.totalCents + o.giftcardCents;

/** Forma de pago que se imprime: "Gift card $2.100,00 + Tarjeta de crédito · 3 cuotas". */
export function paymentLabel(p: {
  method: PaymentMethod | null;
  installments: number | null;
  giftcardCents: number;
}): string | null {
  const parts: string[] = [];
  if (p.giftcardCents > 0) parts.push(`Gift card ${formatARSExact(p.giftcardCents)}`);
  if (p.method && !(p.method === "giftcard" && p.giftcardCents > 0))
    parts.push(`${PAYMENT_METHODS[p.method]}${(p.installments ?? 1) > 1 ? ` · ${p.installments} cuotas` : ""}`);
  return parts.length ? parts.join(" + ") : null;
}

/** Renglones del comprobante: cada prenda, el envío y el cupón (en negativo); suman `invoiceTotal`. */
export function invoiceLines(o: InvoiceOrder): InvoiceLine[] {
  const lines: InvoiceLine[] = o.items.map((i) => ({
    description: `${i.name} · talle ${i.size}`,
    qty: i.qty,
    unitCents: i.unitPriceCents,
    totalCents: i.unitPriceCents * i.qty,
  }));
  if (o.shippingCents > 0)
    lines.push({ description: "Envío", qty: 1, unitCents: o.shippingCents, totalCents: o.shippingCents });
  if (o.discountCents > 0)
    lines.push({
      description: o.couponCode ? `Descuento (cupón ${o.couponCode})` : "Descuento",
      qty: 1,
      unitCents: -o.discountCents,
      totalCents: -o.discountCents,
    });
  return lines;
}

/** "00003-00000042": punto de venta (5) y número (8), como en el comprobante impreso. */
export const formatInvoiceNumber = (pointOfSale: number, number: number) =>
  `${String(pointOfSale).padStart(5, "0")}-${String(number).padStart(8, "0")}`;

export const invoiceLabel = (i: Pick<Invoice, "kind" | "pointOfSale" | "number">) =>
  i.number === null
    ? INVOICE_KINDS[i.kind]
    : `${INVOICE_KINDS[i.kind]} ${formatInvoiceNumber(i.pointOfSale, i.number)}`;

/** Fecha del comprobante (AAAA-MM-DD), en hora de Argentina. */
export const arDate = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(d);

/** Si ARCA no contesta: se reintenta a los 1, 5, 15 y 30 minutos y después cada hora. */
const BACKOFF_MINUTES = [1, 5, 15, 30, 60];
export const retryDelayMs = (attempts: number) =>
  (BACKOFF_MINUTES[Math.min(attempts, BACKOFF_MINUTES.length) - 1] ?? 1) * 60_000;
/** A partir de estos intentos fallidos el panel lo avisa (se sigue reintentando solo). */
export const ATTEMPTS_TO_WARN = 3;

/** URL del QR obligatorio (RG 4892/2020): ARCA muestra los datos del comprobante al escanearlo. */
export function qrUrl(i: Invoice & { number: number; cae: string; issuedOn: string }): string {
  const json = {
    ver: 1,
    fecha: i.issuedOn,
    cuit: Number(i.data.issuer.cuit.replace(/\D/g, "")),
    ptoVta: i.pointOfSale,
    tipoCmp: i.cbteType,
    nroCmp: i.number,
    importe: i.totalCents / 100,
    moneda: "PES",
    ctz: 1,
    tipoDocRec: 99,
    nroDocRec: 0,
    tipoCodAut: "E",
    codAut: Number(i.cae),
  };
  return `https://www.afip.gob.ar/fe/qr/?p=${btoa(JSON.stringify(json))}`;
}

/** Nombre del PDF: "factura-C-00003-00000042.pdf". */
export const invoiceFilename = (i: Pick<Invoice, "kind" | "pointOfSale" | "number">) =>
  `${i.kind === "factura" ? "factura" : "nota-de-credito"}-C-${
    i.number === null ? "borrador" : formatInvoiceNumber(i.pointOfSale, i.number)
  }.pdf`;

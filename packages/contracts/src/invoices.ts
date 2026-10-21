import type { Cents } from "./money";

/**
 * Facturación electrónica (ARCA, web service WSFE): factura C al aprobarse el pago de un pedido de prendas y nota de
 * crédito C si se reintegra. Sin credenciales de ARCA, un emisor simulado (local y CI) sin validez fiscal.
 */
export type InvoiceKind = "factura" | "nota_credito";
/** pendiente: ARCA no contestó y se reintenta solo · error: hay que mirarlo (rechazo o varios intentos fallidos). */
export type InvoiceStatus = "pendiente" | "emitida" | "error" | "anulada";

export const INVOICE_KINDS: Record<InvoiceKind, string> = { factura: "Factura C", nota_credito: "Nota de crédito C" };

/** Un comprobante en el detalle del pedido (panel). */
export type AdminInvoice = {
  id: string;
  kind: InvoiceKind;
  status: InvoiceStatus;
  /** "Factura C 00003-00000042" (sin número mientras no se emite). */
  label: string;
  cae: string | null;
  /** AAAA-MM-DD */
  caeExpiresOn: string | null;
  issuedOn: string | null;
  totalCents: Cents;
  /** Por qué no se emitió todavía (lo que respondió ARCA). */
  error: string | null;
  attempts: number;
  simulated: boolean;
};

/** Pedidos con un comprobante trabado (para la campana del panel). */
export type InvoiceProblem = {
  orderNumber: string;
  kind: InvoiceKind;
  error: string;
  /** ISO: desde cuándo. */
  since: string;
};

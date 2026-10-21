import type { InvoiceKind, InvoiceStatus, StoreFiscal } from "@mini-galu/contracts";
import type { Invoice, InvoiceData, InvoiceOrder } from "../domain/invoice";

/** Lo que se le pide a ARCA para autorizar un comprobante (consumidor final, en pesos). */
export type AuthorizeRequest = {
  cbteType: number;
  number: number;
  /** AAAA-MM-DD */
  issuedOn: string;
  totalCents: number;
  /** Nota de crédito: la factura que anula. */
  associated: { cbteType: number; pointOfSale: number; number: number; issuedOn: string } | null;
};
export type Authorized = { cae: string; caeExpiresOn: string };

/**
 * Emisor de comprobantes: ARCA de verdad con el certificado de Gaby (`ArcaIssuer`), el simulado en local y CI
 * (`SimulatedIssuer`) o ninguno en producción sin credenciales (`NoIssuer`: los pedidos quedan sin facturar y avisa).
 */
export interface InvoiceIssuer {
  readonly mode: "simulado" | "homologacion" | "produccion";
  readonly cuit: string;
  readonly pointOfSale: number;
  /** Último número autorizado de ese tipo en el punto de venta (0 si no hay ninguno). */
  lastNumber(cbteType: number): Promise<number>;
  /** Un comprobante ya autorizado (para saber si un intento sin respuesta quedó emitido). */
  find(cbteType: number, number: number): Promise<(Authorized & { totalCents: number; issuedOn: string }) | null>;
  authorize(r: AuthorizeRequest): Promise<Authorized>;
}

/** ARCA dijo que no (datos mal cargados, fecha fuera de rango…): reintentar igual no sirve, hay que mirarlo. */
export class InvoiceRejected extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvoiceRejected";
  }
}

export type NewInvoice = Pick<
  Invoice,
  "orderId" | "kind" | "cbteType" | "pointOfSale" | "totalCents" | "data" | "associatedId" | "simulated"
>;

export interface InvoiceRepository {
  /** null si ese pedido ya tiene un comprobante de ese tipo. */
  create(i: NewInvoice): Promise<Invoice | null>;
  get(id: string): Promise<Invoice | null>;
  byOrder(orderId: string): Promise<Invoice[]>;
  /** Uno ya emitido con ese número (para no adoptar como propio el de otro pedido). */
  byNumber(simulated: boolean, cbteType: number, pointOfSale: number, number: number): Promise<Invoice | null>;
  /** Pendientes (o con error y reintento programado) cuyo reintento ya venció. */
  due(now: Date): Promise<Invoice[]>;
  /** Con error, sin emitir (la campana del panel). */
  problems(): Promise<(Invoice & { orderNumber: string })[]>;
  /** Último número guardado (el emisor simulado numera a partir de acá). */
  maxNumber(simulated: boolean, cbteType: number, pointOfSale: number): Promise<number>;
  /**
   * Se va a pedir el CAE con este número: queda guardado por si ARCA no contesta. El punto de venta y el CUIT son los
   * del emisor de ahora (el pedido pudo haberse pagado antes de conectar ARCA).
   */
  attempting(
    id: string,
    a: Pick<Invoice, "pointOfSale" | "data"> & { number: number; issuedOn: string },
  ): Promise<void>;
  issued(id: string, r: { number: number; issuedOn: string; cae: string; caeExpiresOn: string }): Promise<void>;
  failed(
    id: string,
    r: { status: Extract<InvoiceStatus, "pendiente" | "error">; error: string; nextAttemptAt: Date | null },
  ): Promise<void>;
  annul(id: string): Promise<void>;
  /** true si recién se marca (otro proceso no lo mandó antes). */
  markMailed(id: string, at: Date): Promise<boolean>;
}

/** Los pedidos vistos desde la facturación (los da el módulo de pedidos). */
export interface InvoiceOrders {
  find(orderId: string): Promise<InvoiceOrder | null>;
  findByNumber(number: string): Promise<InvoiceOrder | null>;
  /** Una línea en la historia del pedido ("Factura C 00003-00000042 emitida"). */
  log(orderId: string, title: string, detail: string | null): Promise<void>;
}

/** Arma el PDF del comprobante (con el QR de ARCA). La nota de crédito nombra la factura que anula. */
export interface InvoiceRenderer {
  pdf(i: Invoice, associated: Invoice | null): Promise<Uint8Array>;
}

export type InvoiceAttachment = { filename: string; content: Uint8Array };

/** El comprobante emitido después del mail del pago o del reintegro le llega solo. */
export interface InvoiceMailer {
  send(o: InvoiceOrder, kind: InvoiceKind, attachment: InvoiceAttachment): Promise<void>;
}

export type FiscalData = () => Promise<Pick<StoreFiscal, "name" | "address" | "iibb" | "activitiesSince">>;
export type { InvoiceData };

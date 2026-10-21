import type { AdminInvoice, InvoiceKind, InvoiceProblem } from "@mini-galu/contracts";
import { NotFoundError } from "../../shared/domain/errors";
import {
  ATTEMPTS_TO_WARN,
  arDate,
  CBTE_TYPE,
  type Invoice,
  type InvoiceOrder,
  invoiceable,
  invoiceFilename,
  invoiceLabel,
  invoiceLines,
  retryDelayMs,
} from "../domain/invoice";
import {
  type FiscalData,
  type InvoiceAttachment,
  type InvoiceIssuer,
  type InvoiceMailer,
  type InvoiceOrders,
  InvoiceRejected,
  type InvoiceRenderer,
  type InvoiceRepository,
} from "./ports";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Facturación electrónica: factura C al aprobarse el pago de un pedido de prendas y nota de crédito C al reintegrarlo.
 * Si ARCA no contesta se reintenta solo (`retryDue`, lo corre el programador); si la rechaza, queda con error y el
 * panel lo avisa. ARCA numera en orden por punto de venta: se emite de a un comprobante por vez.
 */
export class InvoiceService {
  private queue: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly issuer: InvoiceIssuer,
    private readonly repo: InvoiceRepository,
    private readonly orders: InvoiceOrders,
    private readonly renderer: InvoiceRenderer,
    private readonly mailer: InvoiceMailer,
    private readonly fiscal: FiscalData,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  /** Pago aprobado: se crea la factura y se pide el CAE (el mail de confirmación la espera para adjuntarla). */
  async paymentApproved(orderId: string): Promise<void> {
    const o = await this.orders.find(orderId);
    if (!o || !invoiceable(o)) return;
    const created = await this.repo.create({
      orderId,
      kind: "factura",
      cbteType: CBTE_TYPE.factura,
      pointOfSale: this.issuer.pointOfSale,
      totalCents: o.totalCents,
      data: await this.snapshot(o),
      associatedId: null,
      simulated: this.issuer.mode === "simulado",
    });
    if (created) await this.serial(() => this.issueNow(created.id));
  }

  /**
   * Pedido reintegrado: la factura emitida se anula con una nota de crédito por el mismo total. Si todavía no se
   * había emitido, se anula y no se emite.
   */
  async refunded(orderId: string): Promise<void> {
    const nota = await this.serial(async () => {
      const factura = (await this.repo.byOrder(orderId)).find((i) => i.kind === "factura");
      if (!factura || factura.status === "anulada") return null;
      if (factura.status !== "emitida") {
        await this.repo.annul(factura.id);
        await this.orders.log(orderId, "Factura anulada", "Se reintegró antes de que ARCA la emitiera");
        return null;
      }
      return this.repo.create({
        orderId,
        kind: "nota_credito",
        cbteType: CBTE_TYPE.nota_credito,
        pointOfSale: factura.pointOfSale,
        totalCents: factura.totalCents,
        data: factura.data,
        associatedId: factura.id,
        simulated: factura.simulated,
      });
    });
    if (nota) await this.serial(() => this.issueNow(nota.id));
  }

  /** Reintentos vencidos (lo corre el programador). Lo que se emite ahora le llega solo al cliente. */
  async retryDue(): Promise<number> {
    let issued = 0;
    for (const due of await this.repo.due(this.clock())) {
      const i = await this.serial(() => this.issueNow(due.id));
      if (i?.status === "emitida") {
        issued++;
        await this.mailPending(i.orderId);
      }
    }
    return issued;
  }

  /** "Reintentar" desde el detalle del pedido. */
  async retry(orderNumber: string): Promise<AdminInvoice[]> {
    const o = await this.orders.findByNumber(orderNumber);
    if (!o) throw new NotFoundError("No existe ese pedido");
    for (const i of await this.repo.byOrder(o.id))
      if (i.status === "pendiente" || i.status === "error") await this.serial(() => this.issueNow(i.id));
    await this.mailPending(o.id);
    return this.forOrder(o.id);
  }

  /** El comprobante emitido para adjuntar al mail del pago o del reintegro (queda como enviado). */
  async attachment(orderId: string, kind: InvoiceKind): Promise<InvoiceAttachment | null> {
    const i = (await this.repo.byOrder(orderId)).find((x) => x.kind === kind);
    if (i?.status !== "emitida" || i.mailedAt) return null;
    if (!(await this.repo.markMailed(i.id, this.clock()))) return null;
    return { filename: invoiceFilename(i), content: await this.render(i) };
  }

  /** Lo emitido que todavía no le llegó al cliente (el mail del pago salió sin la factura, o no salió). */
  async mailPending(orderId: string): Promise<void> {
    const pending = (await this.repo.byOrder(orderId)).filter((i) => i.status === "emitida" && !i.mailedAt);
    if (!pending.length) return;
    const o = await this.orders.find(orderId);
    if (!o) return;
    for (const i of pending) {
      if (!(await this.repo.markMailed(i.id, this.clock()))) continue;
      await this.mailer.send(o, i.kind, { filename: invoiceFilename(i), content: await this.render(i) });
      await this.orders.log(orderId, `${invoiceLabel(i)} enviada por mail`, `a ${o.email}`);
    }
  }

  async forOrder(orderId: string): Promise<AdminInvoice[]> {
    return (await this.repo.byOrder(orderId)).map(toAdmin);
  }

  async problems(): Promise<InvoiceProblem[]> {
    return (await this.repo.problems()).map((i) => ({
      orderNumber: i.orderNumber,
      kind: i.kind,
      error: i.lastError ?? "No se pudo emitir",
      since: i.createdAt.toISOString(),
    }));
  }

  async pdf(id: string): Promise<{ filename: string; pdf: Uint8Array }> {
    const i = UUID.test(id) ? await this.repo.get(id) : null;
    if (i?.status !== "emitida") throw new NotFoundError("Ese comprobante no está emitido");
    return { filename: invoiceFilename(i), pdf: await this.render(i) };
  }

  /* ---- emisión ---- */

  private async render(i: Invoice) {
    return this.renderer.pdf(i, i.associatedId ? await this.repo.get(i.associatedId) : null);
  }

  private serial<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.queue.then(fn, fn);
    this.queue = run.catch(() => {});
    return run;
  }

  private async snapshot(o: InvoiceOrder): Promise<Invoice["data"]> {
    const f = await this.fiscal();
    return {
      orderNumber: o.number,
      issuer: { ...f, cuit: this.issuer.cuit },
      receptor: { name: `${o.firstName} ${o.lastName}`.trim(), email: o.email },
      lines: invoiceLines(o),
      payment: o.payment,
    };
  }

  /** Pide el CAE. Nunca tira: si falla, queda pendiente (con reintento) o con error, y se devuelve como quedó. */
  private async issueNow(id: string): Promise<Invoice | null> {
    const i = await this.repo.get(id);
    if (!i || i.status === "emitida" || i.status === "anulada") return i;
    const now = this.clock();
    try {
      const last = await this.issuer.lastNumber(i.cbteType);
      // un intento anterior sin respuesta: si ARCA lo autorizó, es este comprobante (no se emite otro)
      if (i.number !== null && i.pointOfSale === this.issuer.pointOfSale && last >= i.number) {
        const taken = await this.repo.byNumber(i.simulated, i.cbteType, i.pointOfSale, i.number);
        const found = taken ? null : await this.issuer.find(i.cbteType, i.number);
        if (found && found.totalCents === i.totalCents) return this.done(i, { number: i.number, ...found });
      }
      const number = last + 1;
      const issuedOn = arDate(now);
      const data = { ...i.data, issuer: { ...i.data.issuer, cuit: this.issuer.cuit } };
      await this.repo.attempting(i.id, { number, issuedOn, pointOfSale: this.issuer.pointOfSale, data });
      const associated = i.associatedId ? await this.repo.get(i.associatedId) : null;
      const r = await this.issuer.authorize({
        cbteType: i.cbteType,
        number,
        issuedOn,
        totalCents: i.totalCents,
        associated:
          associated?.number && associated.issuedOn
            ? {
                cbteType: associated.cbteType,
                pointOfSale: associated.pointOfSale,
                number: associated.number,
                issuedOn: associated.issuedOn,
              }
            : null,
      });
      return this.done(i, { number, issuedOn, ...r });
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      const attempts = i.attempts + 1;
      const rejected = e instanceof InvoiceRejected;
      await this.repo.failed(i.id, {
        status: rejected || attempts >= ATTEMPTS_TO_WARN ? "error" : "pendiente",
        error,
        nextAttemptAt: rejected ? null : new Date(now.getTime() + retryDelayMs(attempts)),
      });
      // en la historia del pedido, una vez (no en cada reintento)
      if (rejected || attempts === 1)
        await this.orders.log(
          i.orderId,
          rejected
            ? `ARCA rechazó la ${i.kind === "factura" ? "factura" : "nota de crédito"}`
            : `${invoiceLabel(i)} sin emitir todavía`,
          rejected ? error : `ARCA no respondió (${error}): se reintenta sola`,
        );
      return this.repo.get(i.id);
    }
  }

  private async done(
    i: Invoice,
    r: { number: number; issuedOn: string; cae: string; caeExpiresOn: string },
  ): Promise<Invoice | null> {
    await this.repo.issued(i.id, r);
    await this.orders.log(
      i.orderId,
      `${invoiceLabel({ ...i, number: r.number })} emitida`,
      `CAE ${r.cae}${i.simulated ? " · simulada, sin validez fiscal" : ""}`,
    );
    return this.repo.get(i.id);
  }
}

function toAdmin(i: Invoice): AdminInvoice {
  const issued = i.status === "emitida";
  return {
    id: i.id,
    kind: i.kind,
    status: i.status,
    label: invoiceLabel(issued ? i : { ...i, number: null }),
    cae: i.cae,
    caeExpiresOn: i.caeExpiresOn,
    issuedOn: issued ? i.issuedOn : null,
    totalCents: i.totalCents,
    error: issued ? null : i.lastError,
    attempts: i.attempts,
    simulated: i.simulated,
  };
}

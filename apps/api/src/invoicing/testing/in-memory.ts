import type { InvoiceKind } from "@mini-galu/contracts";
import type {
  Authorized,
  AuthorizeRequest,
  InvoiceAttachment,
  InvoiceIssuer,
  InvoiceMailer,
  InvoiceOrders,
  InvoiceRenderer,
  InvoiceRepository,
  NewInvoice,
} from "../application/ports";
import type { Invoice, InvoiceOrder } from "../domain/invoice";

export class InMemoryInvoices implements InvoiceRepository {
  rows: Invoice[] = [];
  private seq = 0;

  constructor(private readonly orderNumbers: (orderId: string) => string = (id) => id) {}

  async create(i: NewInvoice) {
    if (this.rows.some((r) => r.orderId === i.orderId && r.kind === i.kind)) return null;
    const row: Invoice = {
      ...i,
      id: `inv-${++this.seq}`,
      status: "pendiente",
      number: null,
      cae: null,
      caeExpiresOn: null,
      issuedOn: null,
      attempts: 0,
      lastError: null,
      nextAttemptAt: null,
      mailedAt: null,
      createdAt: new Date(),
    };
    this.rows.push(row);
    return { ...row };
  }
  async get(id: string) {
    const r = this.rows.find((x) => x.id === id);
    return r ? { ...r } : null;
  }
  async byOrder(orderId: string) {
    return this.rows.filter((r) => r.orderId === orderId).map((r) => ({ ...r }));
  }
  async byNumber(simulated: boolean, cbteType: number, pointOfSale: number, number: number) {
    return (
      this.rows.find(
        (r) =>
          r.status === "emitida" &&
          r.simulated === simulated &&
          r.cbteType === cbteType &&
          r.pointOfSale === pointOfSale &&
          r.number === number,
      ) ?? null
    );
  }
  async due(now: Date) {
    return this.rows.filter(
      (r) => (r.status === "pendiente" || r.status === "error") && r.nextAttemptAt && r.nextAttemptAt <= now,
    );
  }
  async problems() {
    return this.rows
      .filter((r) => r.status === "error")
      .map((r) => ({ ...r, orderNumber: this.orderNumbers(r.orderId) }));
  }
  async maxNumber(simulated: boolean, cbteType: number, pointOfSale: number) {
    return Math.max(
      0,
      ...this.rows
        .filter(
          (r) =>
            r.status === "emitida" &&
            r.simulated === simulated &&
            r.cbteType === cbteType &&
            r.pointOfSale === pointOfSale,
        )
        .map((r) => r.number ?? 0),
    );
  }
  private patch(id: string, p: Partial<Invoice>) {
    const r = this.rows.find((x) => x.id === id);
    if (r) Object.assign(r, p);
  }
  async attempting(id: string, a: Pick<Invoice, "pointOfSale" | "data"> & { number: number; issuedOn: string }) {
    this.patch(id, a);
  }
  async issued(id: string, r: { number: number; issuedOn: string; cae: string; caeExpiresOn: string }) {
    this.patch(id, { ...r, status: "emitida", lastError: null, nextAttemptAt: null });
  }
  async failed(id: string, r: { status: "pendiente" | "error"; error: string; nextAttemptAt: Date | null }) {
    const row = this.rows.find((x) => x.id === id);
    this.patch(id, {
      status: r.status,
      lastError: r.error,
      nextAttemptAt: r.nextAttemptAt,
      attempts: (row?.attempts ?? 0) + 1,
    });
  }
  async annul(id: string) {
    this.patch(id, { status: "anulada", nextAttemptAt: null });
  }
  async markMailed(id: string, at: Date) {
    const r = this.rows.find((x) => x.id === id);
    if (!r || r.mailedAt) return false;
    r.mailedAt = at;
    return true;
  }
}

/** ARCA de mentira: numera en orden y se le puede pedir que falle (sin respuesta o rechazo). */
export class FakeIssuer implements InvoiceIssuer {
  readonly mode = "homologacion" as const;
  readonly cuit = "20123456786";
  readonly pointOfSale = 3;
  authorized: (AuthorizeRequest & Authorized)[] = [];
  /** Errores a tirar en los próximos `authorize` (en orden). */
  failures: Error[] = [];
  /** Autoriza pero "se corta" la respuesta (el CAE queda en ARCA, la API no se entera). */
  dropNextResponse = false;

  async lastNumber(cbteType: number) {
    return Math.max(0, ...this.authorized.filter((a) => a.cbteType === cbteType).map((a) => a.number));
  }
  async find(cbteType: number, number: number) {
    const a = this.authorized.find((x) => x.cbteType === cbteType && x.number === number);
    return a ? { cae: a.cae, caeExpiresOn: a.caeExpiresOn, totalCents: a.totalCents, issuedOn: a.issuedOn } : null;
  }
  async authorize(r: AuthorizeRequest) {
    const failure = this.failures.shift();
    if (failure) throw failure;
    if (r.number !== (await this.lastNumber(r.cbteType)) + 1) throw new Error("10016: número no correlativo");
    const a = { ...r, cae: `7${String(r.number).padStart(13, "0")}`, caeExpiresOn: "2026-10-31" };
    this.authorized.push(a);
    if (this.dropNextResponse) {
      this.dropNextResponse = false;
      throw new Error("timeout");
    }
    return { cae: a.cae, caeExpiresOn: a.caeExpiresOn };
  }
}

export class FakeInvoiceOrders implements InvoiceOrders {
  orders: InvoiceOrder[] = [];
  events: { orderId: string; title: string; detail: string | null }[] = [];
  async find(orderId: string) {
    return this.orders.find((o) => o.id === orderId) ?? null;
  }
  async findByNumber(number: string) {
    return this.orders.find((o) => o.number === number) ?? null;
  }
  async log(orderId: string, title: string, detail: string | null) {
    this.events.push({ orderId, title, detail });
  }
}

export class FakeRenderer implements InvoiceRenderer {
  async pdf(i: Invoice) {
    return new TextEncoder().encode(`PDF ${i.kind} ${i.number}`);
  }
}

export class FakeInvoiceMailer implements InvoiceMailer {
  sent: { to: string; kind: InvoiceKind; attachment: InvoiceAttachment }[] = [];
  async send(o: InvoiceOrder, kind: InvoiceKind, attachment: InvoiceAttachment) {
    this.sent.push({ to: o.email, kind, attachment });
  }
}

export const anOrder = (p: Partial<InvoiceOrder> = {}): InvoiceOrder => ({
  id: "o1",
  number: "MG-1050",
  kind: "prendas",
  firstName: "Lucía",
  lastName: "Fernández",
  email: "lucia@ejemplo.com",
  items: [{ name: "Vestido Lino", size: "4", qty: 2, unitPriceCents: 30_000_00 }],
  discountCents: 6_000_00,
  couponCode: "BIENVENIDA",
  shippingCents: 5_000_00,
  totalCents: 59_000_00,
  payment: "Tarjeta de crédito · 3 cuotas",
  ...p,
});

import { beforeEach, describe, expect, it } from "vitest";
import { qrUrl } from "../domain/invoice";
import {
  anOrder,
  FakeInvoiceMailer,
  FakeInvoiceOrders,
  FakeIssuer,
  FakeRenderer,
  InMemoryInvoices,
} from "../testing/in-memory";
import { InvoiceService } from "./invoice-service";
import { InvoiceRejected } from "./ports";

const FISCAL = {
  name: "Gabriela Pérez",
  address: "Laprida 123, San Miguel de Tucumán",
  iibb: "20-12345678-6",
  activitiesSince: "2024-03-01",
};

let now: Date;
let repo: InMemoryInvoices;
let issuer: FakeIssuer;
let orders: FakeInvoiceOrders;
let mailer: FakeInvoiceMailer;
let service: InvoiceService;

beforeEach(() => {
  now = new Date("2026-10-21T15:00:00Z");
  repo = new InMemoryInvoices(() => "MG-1050");
  issuer = new FakeIssuer();
  orders = new FakeInvoiceOrders();
  orders.orders.push(anOrder());
  mailer = new FakeInvoiceMailer();
  service = new InvoiceService(
    issuer,
    repo,
    orders,
    new FakeRenderer(),
    mailer,
    async () => FISCAL,
    () => now,
  );
});

describe("factura al aprobarse el pago", () => {
  it("emite la factura C por el total del pedido, con los renglones y los datos fiscales congelados", async () => {
    await service.paymentApproved("o1");

    const [inv] = await service.forOrder("o1");
    expect(inv).toMatchObject({
      kind: "factura",
      status: "emitida",
      label: "Factura C 00003-00000001",
      cae: "70000000000001",
      issuedOn: "2026-10-21",
      totalCents: 59_000_00,
    });
    expect(issuer.authorized[0]).toMatchObject({ cbteType: 11, number: 1, totalCents: 59_000_00, associated: null });
    const row = repo.rows[0];
    expect(row?.data.issuer).toEqual({ ...FISCAL, cuit: "20123456786" });
    expect(row?.data.lines.map((l) => [l.description, l.totalCents])).toEqual([
      ["Vestido Lino · talle 4", 60_000_00],
      ["Envío", 5_000_00],
      ["Descuento (cupón BIENVENIDA)", -6_000_00],
    ]);
    expect(row?.data.lines.reduce((s, l) => s + l.totalCents, 0)).toBe(59_000_00);
    expect(orders.events.map((e) => e.title)).toEqual(["Factura C 00003-00000001 emitida"]);
  });

  it("numera en orden aunque se aprueben dos pagos a la vez", async () => {
    orders.orders.push(anOrder({ id: "o2", number: "MG-1051" }));
    await Promise.all([service.paymentApproved("o1"), service.paymentApproved("o2")]);
    expect(issuer.authorized.map((a) => a.number).sort()).toEqual([1, 2]);
    expect(repo.rows.every((r) => r.status === "emitida")).toBe(true);
  });

  it("no factura la compra de una gift card, un pedido en $0 ni dos veces el mismo pago", async () => {
    orders.orders.push(anOrder({ id: "gc", kind: "giftcard" }), anOrder({ id: "cero", totalCents: 0 }));
    await service.paymentApproved("gc");
    await service.paymentApproved("cero");
    await service.paymentApproved("o1");
    await service.paymentApproved("o1");
    expect(repo.rows.map((r) => r.orderId)).toEqual(["o1"]);
    expect(issuer.authorized).toHaveLength(1);
  });

  it("la factura emitida se adjunta una sola vez", async () => {
    await service.paymentApproved("o1");
    const a = await service.attachment("o1", "factura");
    expect(a?.filename).toBe("factura-C-00003-00000001.pdf");
    expect(await service.attachment("o1", "factura")).toBeNull();
    await service.mailPending("o1");
    expect(mailer.sent).toHaveLength(0);
  });

  it("el QR lleva los datos del comprobante como pide ARCA", async () => {
    await service.paymentApproved("o1");
    const i = repo.rows[0] as Parameters<typeof qrUrl>[0];
    const url = new URL(qrUrl(i));
    expect(url.origin + url.pathname).toBe("https://www.afip.gob.ar/fe/qr/");
    expect(JSON.parse(atob(url.searchParams.get("p") ?? ""))).toEqual({
      ver: 1,
      fecha: "2026-10-21",
      cuit: 20123456786,
      ptoVta: 3,
      tipoCmp: 11,
      nroCmp: 1,
      importe: 59000,
      moneda: "PES",
      ctz: 1,
      tipoDocRec: 99,
      nroDocRec: 0,
      tipoCodAut: "E",
      codAut: 70000000000001,
    });
  });
});

describe("si ARCA no contesta o rechaza", () => {
  it("queda pendiente, se reintenta sola y le llega al cliente cuando se emite", async () => {
    issuer.failures.push(new Error("ECONNRESET"));
    await service.paymentApproved("o1");
    expect((await service.forOrder("o1"))[0]).toMatchObject({ status: "pendiente", error: "ECONNRESET" });
    expect(await service.attachment("o1", "factura")).toBeNull();
    expect(orders.events.at(-1)?.title).toBe("Factura C sin emitir todavía");

    expect(await service.retryDue()).toBe(0); // todavía no venció el reintento (1 minuto)
    now = new Date(now.getTime() + 61_000);
    expect(await service.retryDue()).toBe(1);
    expect((await service.forOrder("o1"))[0]?.status).toBe("emitida");
    expect(mailer.sent).toMatchObject([{ to: "lucia@ejemplo.com", kind: "factura" }]);
    expect(orders.events.at(-1)?.title).toBe("Factura C 00003-00000001 enviada por mail");
  });

  it("después de 3 intentos fallidos el panel lo avisa, y se sigue reintentando", async () => {
    issuer.failures.push(new Error("503"), new Error("503"), new Error("503"));
    await service.paymentApproved("o1");
    for (const _ of [1, 2]) {
      now = new Date(now.getTime() + 60 * 60_000);
      await service.retryDue();
    }
    expect(await service.problems()).toEqual([
      { orderNumber: "MG-1050", kind: "factura", error: "503", since: expect.any(String) },
    ]);
    now = new Date(now.getTime() + 60 * 60_000);
    await service.retryDue();
    expect(await service.problems()).toEqual([]);
    // la historia del pedido no se llena con cada intento
    expect(orders.events.filter((e) => e.title === "Factura C sin emitir todavía")).toHaveLength(1);
  });

  it("si ARCA la rechaza no se reintenta sola: se reintenta desde el panel", async () => {
    issuer.failures.push(new InvoiceRejected("10015: DocTipo inválido"));
    await service.paymentApproved("o1");
    expect((await service.forOrder("o1"))[0]).toMatchObject({ status: "error", error: "10015: DocTipo inválido" });
    expect(orders.events.at(-1)).toMatchObject({ title: "ARCA rechazó la factura", detail: "10015: DocTipo inválido" });
    now = new Date(now.getTime() + 24 * 3600_000);
    expect(await service.retryDue()).toBe(0);

    const after = await service.retry("MG-1050");
    expect(after[0]?.status).toBe("emitida");
    expect(mailer.sent).toHaveLength(1);
  });

  it("si el CAE se autorizó pero la respuesta no llegó, al reintentar se recupera (no se emite otra)", async () => {
    issuer.dropNextResponse = true;
    await service.paymentApproved("o1");
    expect(repo.rows[0]?.status).toBe("pendiente");
    now = new Date(now.getTime() + 61_000);
    await service.retryDue();
    expect(issuer.authorized).toHaveLength(1);
    expect(repo.rows[0]).toMatchObject({ status: "emitida", number: 1, cae: "70000000000001" });
  });
});

describe("nota de crédito al reintegrar", () => {
  it("anula la factura emitida con una nota de crédito C por el mismo total", async () => {
    await service.paymentApproved("o1");
    await service.refunded("o1");
    const [, nota] = await service.forOrder("o1");
    expect(nota).toMatchObject({ kind: "nota_credito", status: "emitida", label: "Nota de crédito C 00003-00000001" });
    expect(issuer.authorized[1]).toMatchObject({
      cbteType: 13,
      number: 1,
      totalCents: 59_000_00,
      associated: { cbteType: 11, pointOfSale: 3, number: 1, issuedOn: "2026-10-21" },
    });
    expect((await service.attachment("o1", "nota_credito"))?.filename).toBe("nota-de-credito-C-00003-00000001.pdf");
  });

  it("si la factura no se había emitido, se anula y no hay nota de crédito", async () => {
    issuer.failures.push(new Error("timeout"));
    await service.paymentApproved("o1");
    await service.refunded("o1");
    expect((await service.forOrder("o1")).map((i) => [i.kind, i.status])).toEqual([["factura", "anulada"]]);
    now = new Date(now.getTime() + 3600_000);
    expect(await service.retryDue()).toBe(0);
    expect(issuer.authorized).toHaveLength(0);
  });
});

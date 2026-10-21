import { writeFileSync } from "node:fs";
import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import type { Invoice } from "../domain/invoice";
import { PdfInvoiceRenderer } from "./pdf-invoice-renderer";

const factura: Invoice = {
  id: "inv-1",
  orderId: "o1",
  kind: "factura",
  status: "emitida",
  cbteType: 11,
  pointOfSale: 3,
  number: 42,
  cae: "76123456789012",
  caeExpiresOn: "2026-10-31",
  issuedOn: "2026-10-21",
  totalCents: 59_000_00,
  data: {
    orderNumber: "MG-1050",
    issuer: {
      name: "Gabriela Pérez",
      cuit: "20123456786",
      address: "Laprida 123, San Miguel de Tucumán, Tucumán",
      iibb: "20-12345678-6",
      activitiesSince: "2024-03-01",
    },
    receptor: { name: "Lucía Fernández", email: "lucia@ejemplo.com" },
    lines: [
      { description: "Vestido Lino · talle 4", qty: 2, unitCents: 30_000_00, totalCents: 60_000_00 },
      { description: "Envío", qty: 1, unitCents: 5_000_00, totalCents: 5_000_00 },
      { description: "Descuento (cupón BIENVENIDA)", qty: 1, unitCents: -6_000_00, totalCents: -6_000_00 },
    ],
    payment: "Tarjeta de crédito · 3 cuotas ♡",
  },
  associatedId: null,
  simulated: false,
  attempts: 0,
  lastError: null,
  nextAttemptAt: null,
  mailedAt: null,
  createdAt: new Date(),
};

describe("PDF del comprobante", () => {
  it("arma una página A4 con el título del comprobante (y no se rompe con caracteres fuera de WinAnsi)", async () => {
    const bytes = await new PdfInvoiceRenderer().pdf(factura, null);
    if (process.env.INVOICE_PDF_OUT) writeFileSync(process.env.INVOICE_PDF_OUT, bytes);
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(1);
    expect(doc.getTitle()).toBe("FACTURA C 00003-00000042");
  });

  it("la nota de crédito nombra la factura que anula y la simulada lleva la marca", async () => {
    const nota = { ...factura, id: "inv-2", kind: "nota_credito" as const, cbteType: 13, number: 1, simulated: true };
    const bytes = await new PdfInvoiceRenderer().pdf(nota, factura);
    if (process.env.INVOICE_PDF_OUT) writeFileSync(process.env.INVOICE_PDF_OUT.replace(".pdf", "-nc.pdf"), bytes);
    expect((await PDFDocument.load(bytes)).getTitle()).toBe("NOTA DE CRÉDITO C 00003-00000001");
  });

  it("no arma el PDF de un comprobante sin emitir", async () => {
    await expect(new PdfInvoiceRenderer().pdf({ ...factura, number: null, cae: null }, null)).rejects.toThrow();
  });
});

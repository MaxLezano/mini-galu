import { formatARSExact } from "@mini-galu/contracts";
import { degrees, PDFDocument, type PDFFont, rgb, StandardFonts } from "pdf-lib";
import QRCode from "qrcode";
import type { InvoiceRenderer } from "../application/ports";
import { formatInvoiceNumber, type Invoice, qrUrl } from "../domain/invoice";

/** Paleta del atelier (design-tokens) en RGB. */
const INK = rgb(0x3a / 255, 0x2a / 255, 0x22 / 255);
const INK2 = rgb(0x6e / 255, 0x5a / 255, 0x4e / 255);
const LINE = rgb(0xe6 / 255, 0xdc / 255, 0xcf / 255);
const CANELA = rgb(0xa9 / 255, 0x5e / 255, 0x3a / 255);

const TITLE = { factura: "FACTURA", nota_credito: "NOTA DE CRÉDITO" } as const;
const CODE = { 11: "COD. 011", 13: "COD. 013" } as Record<number, string>;

const dmy = (iso: string | null) => (iso ? iso.split("-").reverse().join("/") : "—");
const cuitFmt = (c: string) => (/^\d{11}$/.test(c) ? `${c.slice(0, 2)}-${c.slice(2, 10)}-${c.slice(10)}` : c || "—");
/** Las fuentes estándar del PDF son WinAnsi: lo que no entra (emojis, ♡) se saca. */
const safe = (t: string) => t.replace(/[^\n -ÿ]/g, "");

/**
 * Factura / nota de crédito C en A4, con los datos que pide ARCA (RG 1415 y RG 4892): emisor, letra y código,
 * punto de venta y número, receptor, detalle, total, CAE con su vencimiento y el QR.
 */
export class PdfInvoiceRenderer implements InvoiceRenderer {
  async pdf(i: Invoice, associated: Invoice | null): Promise<Uint8Array> {
    if (i.number === null || !i.cae || !i.issuedOn) throw new Error("El comprobante todavía no está emitido");
    const doc = await PDFDocument.create();
    doc.setTitle(`${TITLE[i.kind]} C ${formatInvoiceNumber(i.pointOfSale, i.number)}`);
    doc.setAuthor(i.data.issuer.name || "Mini Galú");
    const page = doc.addPage([595.28, 841.89]);
    const regular = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    const W = page.getWidth();
    const M = 40;
    const text = (t: string, x: number, y: number, size = 9, font: PDFFont = regular, color = INK) =>
      page.drawText(safe(t), { x, y, size, font, color });
    const right = (t: string, xRight: number, y: number, size = 9, font: PDFFont = regular) =>
      text(t, xRight - font.widthOfTextAtSize(safe(t), size), y, size, font);
    const box = (x: number, y: number, w: number, h: number) =>
      page.drawRectangle({ x, y, width: w, height: h, borderColor: LINE, borderWidth: 1 });

    // ORIGINAL
    let y = 800;
    box(M, y - 4, W - 2 * M, 18);
    text("ORIGINAL", W / 2 - bold.widthOfTextAtSize("ORIGINAL", 10) / 2, y + 1, 10, bold);

    // cabecera: emisor | letra | comprobante
    const headTop = y - 4;
    const headH = 128;
    box(M, headTop - headH, W - 2 * M, headH);
    page.drawLine({ start: { x: W / 2, y: headTop - 40 }, end: { x: W / 2, y: headTop - headH }, color: LINE });
    box(W / 2 - 24, headTop - 44, 48, 44);
    text("C", W / 2 - bold.widthOfTextAtSize("C", 26) / 2, headTop - 28, 26, bold);
    const code = CODE[i.cbteType] ?? "";
    text(code, W / 2 - regular.widthOfTextAtSize(code, 7) / 2, headTop - 40, 7);

    const issuer = i.data.issuer;
    y = headTop - 30;
    text(issuer.name || "Mini Galú", M + 12, y, 13, bold);
    y -= 26;
    text("Razón social:", M + 12, y, 8.5, bold);
    text(issuer.name || "—", M + 72, y, 8.5);
    y -= 14;
    text("Domicilio comercial:", M + 12, y, 8.5, bold);
    for (const [n, l] of wrap(safe(issuer.address || "—"), W / 2 - M - 112, 8.5, regular).entries())
      text(l, M + 100, y - n * 11, 8.5);
    y -= 28;
    text("Condición frente al IVA:", M + 12, y, 8.5, bold);
    text("Responsable Monotributo", M + 118, y, 8.5);

    const rx = W / 2 + 34;
    y = headTop - 30;
    text(TITLE[i.kind], rx, y, 15, bold);
    y -= 22;
    const kv = (k: string, v: string) => {
      text(k, rx, y, 8.5, bold);
      text(v, rx + 112, y, 8.5);
      y -= 13;
    };
    kv("Punto de venta:", String(i.pointOfSale).padStart(5, "0"));
    kv("Comp. Nro:", String(i.number).padStart(8, "0"));
    kv("Fecha de emisión:", dmy(i.issuedOn));
    kv("CUIT:", cuitFmt(issuer.cuit));
    kv("Ingresos Brutos:", issuer.iibb || "—");
    kv("Inicio de actividades:", dmy(issuer.activitiesSince || null));

    // receptor
    y = headTop - headH - 8;
    const recH = associated ? 62 : 50;
    box(M, y - recH, W - 2 * M, recH);
    y -= 16;
    text("Cliente:", M + 12, y, 8.5, bold);
    text(i.data.receptor.name || "Consumidor final", M + 60, y, 8.5);
    text("Condición frente al IVA:", W / 2 + 10, y, 8.5, bold);
    text("Consumidor Final", W / 2 + 116, y, 8.5);
    y -= 13;
    text("Pedido:", M + 12, y, 8.5, bold);
    text(i.data.orderNumber, M + 60, y, 8.5);
    text("Condición de venta:", W / 2 + 10, y, 8.5, bold);
    text(i.data.payment ?? "Contado", W / 2 + 116, y, 8.5);
    y -= 13;
    text("Email:", M + 12, y, 8.5, bold);
    text(i.data.receptor.email, M + 60, y, 8.5);
    if (associated?.number != null) {
      y -= 13;
      text("Anula:", M + 12, y, 8.5, bold);
      text(
        `Factura C ${formatInvoiceNumber(associated.pointOfSale, associated.number)} del ${dmy(associated.issuedOn)}`,
        M + 60,
        y,
        8.5,
      );
    }

    // detalle
    y = headTop - headH - 8 - recH - 22;
    const cols = { desc: M + 8, qty: W - M - 190, unit: W - M - 95, total: W - M - 8 };
    page.drawRectangle({ x: M, y: y - 5, width: W - 2 * M, height: 18, color: rgb(0.957, 0.929, 0.89) });
    text("Descripción", cols.desc, y, 8.5, bold);
    right("Cant.", cols.qty, y, 8.5, bold);
    right("Precio unit.", cols.unit, y, 8.5, bold);
    right("Subtotal", cols.total, y, 8.5, bold);
    y -= 20;
    for (const l of i.data.lines) {
      const lines = wrap(safe(l.description), cols.qty - cols.desc - 50, 9, regular);
      for (const [n, t] of lines.entries()) text(t, cols.desc, y - n * 11, 9);
      right(String(l.qty), cols.qty, y, 9);
      right(formatARSExact(l.unitCents), cols.unit, y, 9);
      right(formatARSExact(l.totalCents), cols.total, y, 9);
      const bottom = y - 11 * (lines.length - 1) - 6;
      page.drawLine({ start: { x: M, y: bottom }, end: { x: W - M, y: bottom }, color: LINE, thickness: 0.5 });
      y = bottom - 14;
    }

    // total
    y -= 14;
    box(W - M - 230, y - 10, 230, 30);
    text("Importe total:", W - M - 220, y, 11, bold);
    right(formatARSExact(i.totalCents), W - M - 10, y, 11, bold);

    // CAE y QR (RG 4892)
    const qr = QRCode.create(qrUrl({ ...i, number: i.number, cae: i.cae, issuedOn: i.issuedOn }), {
      errorCorrectionLevel: "M",
    });
    const size = 96;
    const cell = size / qr.modules.size;
    const qx = M;
    const qy = 70;
    for (let r = 0; r < qr.modules.size; r++)
      for (let c = 0; c < qr.modules.size; c++)
        if (qr.modules.get(r, c))
          page.drawRectangle({
            x: qx + c * cell,
            y: qy + size - (r + 1) * cell,
            width: cell,
            height: cell,
            color: INK,
          });
    text("Comprobante autorizado por ARCA", qx + size + 16, qy + size - 14, 10, bold);
    text("CAE N°:", qx + size + 16, qy + size - 34, 9, bold);
    text(i.cae, qx + size + 90, qy + size - 34, 9);
    text("Vto. del CAE:", qx + size + 16, qy + size - 48, 9, bold);
    text(dmy(i.caeExpiresOn), qx + size + 90, qy + size - 48, 9);
    text("Escaneá el QR para verificarlo en el sitio de ARCA.", qx + size + 16, qy + size - 66, 8, regular, INK2);
    text("Mini Galú · ropa de diseño para niñas", M, 40, 8, regular, INK2);

    if (i.simulated) {
      const mark = "SIMULADA · SIN VALIDEZ FISCAL";
      page.drawText(mark, {
        x: 110,
        y: 260,
        size: 34,
        font: bold,
        color: CANELA,
        opacity: 0.18,
        rotate: degrees(35),
      });
    }
    return doc.save();
  }
}

/** Corta un texto en renglones que entren en `maxWidth`. */
function wrap(t: string, maxWidth: number, size: number, font: PDFFont) {
  const out: string[] = [];
  let line = "";
  for (const word of t.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) > maxWidth && line) {
      out.push(line);
      line = word;
    } else line = next;
  }
  if (line) out.push(line);
  return out.length ? out : [""];
}

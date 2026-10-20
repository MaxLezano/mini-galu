import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import type { NewShipment, ShippingGateway } from "../application/ports";
import type { CarrierCode, CarrierEvent } from "../domain/tracking";

const HOUR = 3_600_000;

/** Recorrido simulado: horas desde que se generó la etiqueta (como el mockup de seguimiento). */
const TIMELINE: Record<"domicilio" | "sucursal", [number, CarrierCode, string, string][]> = {
  domicilio: [
    [4, "picked_up", "Retirado por Andreani", "Taller Mini Galú"],
    [7, "hub", "Ingresó al centro de distribución", "Centro de distribución Andreani"],
    [18, "in_transit", "En tránsito hacia la sucursal de destino", "Centro de distribución Andreani"],
    [44, "out_for_delivery", "Salió a reparto", "Sucursal de destino"],
    [50, "delivered", "Entregado", "Recibió el destinatario"],
  ],
  sucursal: [
    [4, "picked_up", "Retirado por Andreani", "Taller Mini Galú"],
    [7, "hub", "Ingresó al centro de distribución", "Centro de distribución Andreani"],
    [18, "in_transit", "En tránsito hacia la sucursal de destino", "Centro de distribución Andreani"],
    [40, "at_branch", "Listo para retirar en la sucursal", "Sucursal Andreani"],
    [64, "delivered", "Retirado de la sucursal", "Sucursal Andreani"],
  ],
};

/**
 * Andreani de mentira para local y CI (PLAN §6): el número de seguimiento lleva adentro cuándo se creó y si va a
 * domicilio o a sucursal, así los eventos salen siempre iguales aunque se reinicie la API.
 * `speed` acelera el recorrido (60 = una hora del correo por minuto) para probarlo a mano.
 */
export class FakeAndreani implements ShippingGateway {
  readonly carrier = "andreani";
  readonly mode = "simulado" as const;

  constructor(
    private readonly clock: () => Date = () => new Date(),
    private readonly speed = 1,
  ) {}

  async createShipment(s: NewShipment) {
    const ms = String(this.clock().getTime()).padStart(13, "0");
    return { trackingNumber: `3${ms}${s.method === "sucursal" ? 2 : 1}` };
  }

  async events(trackingNumber: string): Promise<CarrierEvent[]> {
    const m = /^3(\d{13})([12])$/.exec(trackingNumber);
    if (!m) return [];
    const created = Number(m[1]);
    const now = this.clock().getTime();
    return TIMELINE[m[2] === "2" ? "sucursal" : "domicilio"]
      .map(([h, code, title, location]) => ({ code, title, location, at: new Date(created + (h * HOUR) / this.speed) }))
      .filter((e) => e.at.getTime() <= now);
  }

  trackingUrl(): string | null {
    return null; // un número de prueba no existe en la web de Andreani
  }

  async label(trackingNumber: string, s: NewShipment): Promise<Uint8Array> {
    return shippingLabel(trackingNumber, s);
  }
}

/** PDF 10×15 cm con remitente, destinatario y número de seguimiento. Marcado como prueba: no sirve para despachar. */
export async function shippingLabel(trackingNumber: string, s: NewShipment): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Etiqueta ${s.orderNumber}`);
  const cm = 72 / 2.54;
  const page = pdf.addPage([10 * cm, 15 * cm]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.23, 0.16, 0.13);
  // las fuentes estándar del PDF solo tienen Latin-1: lo demás (emojis, comillas raras) se saca
  const safe = (t: string) => t.replace(/[^ -ÿ]/g, "");
  let y = page.getHeight() - 28;
  const line = (text: string, size = 10, font = regular, gap = 4) => {
    page.drawText(safe(text), { x: 20, y, size, font, color: ink, maxWidth: page.getWidth() - 40 });
    y -= size + gap;
  };
  const rule = () => {
    y -= 4;
    page.drawLine({
      start: { x: 20, y },
      end: { x: page.getWidth() - 20, y },
      thickness: 0.8,
      color: ink,
      dashArray: [3, 3],
    });
    y -= 14;
  };

  line("ANDREANI", 16, bold, 2);
  line("ETIQUETA DE PRUEBA · no válida para despachar", 7.5, regular, 6);
  rule();
  line("REMITENTE", 7.5, bold);
  line("Mini Galú · Taller", 10);
  line(s.from ? `${s.from.origin.city}, ${s.from.origin.province}` : "Taller", 10, regular, 6);
  rule();
  line("DESTINATARIO", 7.5, bold);
  line(s.recipient.name, 13, bold, 6);
  if (s.method === "domicilio") {
    if (s.street) line(s.street, 11);
    line(`${s.city ?? ""}${s.city ? ", " : ""}${s.province}`, 11);
  } else {
    line(s.branch ? `Retira en sucursal ${s.branch.name}` : "Retira en la sucursal Andreani más cercana", 11);
    line(s.branch?.address ?? s.province, 11);
  }
  line(`CP ${s.postalCode}`, 14, bold, 6);
  line(`Tel. ${s.recipient.phone}`, 9);
  if (s.notes) line(`Nota: ${s.notes}`, 8.5);
  rule();
  line(`Pedido #${s.orderNumber} · ${s.units} ${s.units === 1 ? "prenda" : "prendas"}`, 10, regular, 10);
  line("Nº DE SEGUIMIENTO", 7.5, bold);
  line(trackingNumber.replace(/(\d{3})(?=\d)/g, "$1 "), 17, bold);
  return pdf.save();
}

import { describe, expect, it } from "vitest";
import {
  type CarrierEvent,
  recipientLabel,
  type TrackedOrder,
  trackingLog,
  trackingStops,
  whenLabel,
} from "./tracking";

const d = (iso: string) => new Date(iso);
const base = (over: Partial<TrackedOrder> = {}): TrackedOrder => ({
  status: "nuevo",
  shippingMethod: "domicilio",
  channel: "web",
  createdAt: d("2026-10-02T21:40:00-03:00"),
  paidAt: d("2026-10-02T21:48:00-03:00"),
  paidWith: "Tarjeta de crédito · 3 cuotas",
  moves: [],
  workshop: "Villa Crespo, CABA",
  ...over,
});

describe("seguimiento", () => {
  it("fechas en hora de Argentina", () => {
    expect(whenLabel(d("2026-10-05T21:40:00-03:00"))).toBe("Lun 5 oct · 21:40");
    expect(recipientLabel("Lucía", "Fernández")).toBe("Lucía F.");
  });

  it("envío en camino: 4 de 5 puntos con fecha y el recorrido de Andreani primero", () => {
    const ev: CarrierEvent[] = [
      {
        code: "picked_up",
        title: "Retirado por Andreani",
        location: "Villa Crespo, CABA",
        at: d("2026-10-05T16:30:00-03:00"),
      },
      { code: "in_transit", title: "En tránsito", location: "Benavídez", at: d("2026-10-05T21:40:00-03:00") },
    ];
    const o = base({
      status: "en_camino",
      moves: [
        { to: "preparando", at: d("2026-10-03T12:20:00-03:00") },
        { to: "listo", at: d("2026-10-05T11:02:00-03:00") },
        { to: "en_camino", at: d("2026-10-05T16:30:00-03:00") },
      ],
    });
    const stops = trackingStops(o, ev);
    expect(stops.map((s) => s.done)).toEqual([true, true, true, true, false]);
    expect(stops.map((s) => s.detail)).toEqual(["vie 2 oct", "sáb 3 oct", "lun 5 oct", "lun 5 oct", ""]);
    const log = trackingLog(o, { trackingNumber: "360001", createdAt: d("2026-10-05T11:02:00-03:00") }, ev);
    expect(log.map((l) => l.title)).toEqual([
      "En tránsito",
      "Retirado por Andreani",
      "Etiqueta generada",
      "En preparación en el taller",
      "Pago aprobado",
    ]);
    expect(log[4]?.detail).toBe("Vie 2 oct · 21:48 · Tarjeta de crédito · 3 cuotas");
  });

  it("retiro en el taller: 4 puntos y sin Andreani", () => {
    const o = base({
      shippingMethod: "taller",
      status: "listo",
      moves: [
        { to: "preparando", at: d("2026-10-03T12:00:00-03:00") },
        { to: "listo", at: d("2026-10-03T15:00:00-03:00") },
      ],
    });
    expect(trackingStops(o, []).map((s) => [s.title, s.done])).toEqual([
      ["Pagado", true],
      ["Preparando", true],
      ["Listo para retirar", true],
      ["Retirado", false],
    ]);
    expect(trackingLog(o, null, [])[0]?.title).toBe("Listo para retirar en el taller");
  });

  it("link sin pagar: ningún punto hecho y el pedido creado esperando el pago", () => {
    const o = base({ status: "esperando_pago", paidAt: null, paidWith: null, channel: "whatsapp" });
    expect(trackingStops(o, []).some((s) => s.done)).toBe(false);
    expect(trackingLog(o, null, [])).toEqual([expect.objectContaining({ title: "Pedido creado · esperando el pago" })]);
  });
});

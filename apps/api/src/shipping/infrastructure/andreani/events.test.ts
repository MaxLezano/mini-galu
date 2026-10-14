import { describe, expect, it } from "vitest";
import { type AndreaniTrace, carrierEvents, traceDate } from "./events";

const t = (Evento: string, Fecha: string, over: Partial<AndreaniTrace> = {}): AndreaniTrace => ({
  Fecha,
  Ciclo: "Distribution",
  Evento,
  ...over,
});

describe("trazas de Andreani", () => {
  it("las fechas vienen en hora de Argentina", () => {
    expect(traceDate("2025-10-08T12:19:04.054").toISOString()).toBe("2025-10-08T15:19:04.054Z");
    expect(traceDate("2025-10-08T12:19:04Z").toISOString()).toBe("2025-10-08T12:19:04.000Z");
  });

  it("se traducen a los pasos del seguimiento y se descarta lo interno", () => {
    const ev = carrierEvents([
      t("EnvioEntregado", "2025-10-08T12:19:04", { Sucursal: "PALERMO" }),
      t("Impresion", "2025-10-05T10:00:00"),
      t("Admision", "2025-10-05T16:30:00", { Sucursal: "VILLA CRESPO" }),
      t("EnvioDespachado", "2025-10-05T21:40:00"),
      t("ExpedicionHojaDeRutaDeViaje", "2025-10-05T21:40:00"), // mismo paso y momento: no se repite
      t("RecepcionEnSucursalDestino", "2025-10-06T09:00:00"),
      t("Visita", "2025-10-07T11:00:00", { Motivo: "Ausente" }),
      t("Distribucion", "2025-10-08T08:00:00"),
    ]);
    expect(ev.map((e) => [e.code, e.title])).toEqual([
      ["picked_up", "Recibido por Andreani"],
      ["in_transit", "En viaje hacia la sucursal de destino"],
      ["hub", "Llegó a la sucursal de destino"],
      ["issue", "Visita sin éxito: ausente"],
      ["out_for_delivery", "Salió a reparto"],
      ["delivered", "Entregado"],
    ]);
    expect(ev[0]?.location).toBe("VILLA CRESPO");
  });

  it("retiro en sucursal y devolución al remitente", () => {
    const ev = carrierEvents([
      t("ComienzoCustodiaEnSucursal", "2025-10-06T09:00:00"),
      t("EnvioNoEntregado", "2025-10-16T09:00:00", { Motivo: "No retirado" }),
      t("EnvioRendido", "2025-10-20T09:00:00", { Ciclo: "Drop" }),
    ]);
    expect(ev.map((e) => e.title)).toEqual([
      "Listo para retirar en la sucursal",
      "No se pudo entregar: no retirado",
      "El envío volvió al remitente",
    ]);
  });
});

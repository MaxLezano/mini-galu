import { DEFAULT_POLICIES, type StorePolicies } from "@mini-galu/contracts";
import { describe, expect, it } from "vitest";
import { TableShippingRates } from "../infrastructure/table-shipping-rates";
import { ShippingService } from "./shipping-service";

// viernes 9/10 a las 12 h en Argentina
const clock = () => new Date("2026-10-09T15:00:00Z");

function service(over: Partial<StorePolicies> = {}) {
  // con envío gratis desde $90.000 (en la base de la tienda está apagado)
  const p = { ...DEFAULT_POLICIES, freeShipping: { enabled: true, fromCents: 90_000_00 }, ...over };
  const policies = { get: async () => p };
  return new ShippingService(new TableShippingRates(policies), clock, null, policies);
}

describe("ShippingService con las políticas del panel", () => {
  it("cotiza con la tabla de la zona y aplica el envío gratis desde el monto", async () => {
    const s = service({
      rates: { ...DEFAULT_POLICIES.rates, amba: { domicilioCents: 4_000_00, sucursalCents: 3_000_00, days: "1 a 2" } },
    });
    const { options } = await s.options("1414", 10_000_00);
    expect(options.map((o) => [o.method, o.cents])).toEqual([
      ["domicilio", 4_000_00],
      ["sucursal", 3_000_00],
      ["taller", 0],
    ]);
    expect(options[0]?.detail).toBe("Llega en 1 a 2 días hábiles");
    expect(await s.cost("domicilio", "1414", 90_000_00)).toBe(0);
  });

  it("sin envío gratis cobra el envío aunque la compra sea grande", async () => {
    const s = service({ freeShipping: { enabled: false, fromCents: 90_000_00 } });
    expect(await s.cost("domicilio", "1414", 500_000_00)).toBe(5_900_00);
    expect(await s.freeShippingFrom()).toBeNull();
  });

  it("solo ofrece las formas de entrega prendidas y rechaza las apagadas", async () => {
    const s = service({ methods: { domicilio: true, sucursal: false, taller: false } });
    const r = await s.options("1414", 0);
    expect(r.options.map((o) => o.method)).toEqual(["domicilio"]);
    expect(r.pickupSlots).toEqual([]);
    await expect(s.checkDelivery({ method: "taller", pickupSlot: "2026-10-10T10-13" })).rejects.toThrow(
      "Esa forma de entrega ya no está disponible",
    );
    await expect(s.checkDelivery({ method: "domicilio" })).resolves.toBeUndefined();
  });

  it("ofrece las franjas de retiro que cargó Gaby", async () => {
    const s = service({ pickupHours: [[], [], [], [], [], [], [[9, 12]]] });
    const r = await s.options(undefined, 0);
    // se ofrecen las de las próximas dos semanas
    expect(r.pickupSlots.map((x) => x.label)).toEqual(["Sáb 10 · 9 a 12 h", "Sáb 17 · 9 a 12 h"]);
    await expect(s.checkDelivery({ method: "taller", pickupSlot: "2026-10-10T10-13" })).rejects.toThrow(
      "Ese horario de retiro",
    );
    await expect(s.checkDelivery({ method: "taller", pickupSlot: "2026-10-10T9-12" })).resolves.toBeUndefined();
  });
});

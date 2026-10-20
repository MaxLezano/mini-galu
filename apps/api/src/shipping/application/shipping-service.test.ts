import { DEFAULT_POLICIES, type StorePolicies } from "@mini-galu/contracts";
import { describe, expect, it } from "vitest";
import { SimulatedAndreaniRates } from "../infrastructure/simulated-andreani-rates";
import { ShippingService } from "./shipping-service";

// viernes 9/10 a las 12 h en Argentina
const clock = () => new Date("2026-10-09T15:00:00Z");

function service(over: Partial<StorePolicies> = {}) {
  // con envío gratis desde $90.000 (en la base de la tienda está apagado)
  const p = { ...DEFAULT_POLICIES, freeShipping: { enabled: true, fromCents: 90_000_00 }, ...over };
  const policies = { get: async () => p };
  return new ShippingService(new SimulatedAndreaniRates(), clock, null, policies);
}

describe("ShippingService con las políticas del panel", () => {
  it("ofrece Andreani (con su precio), envío a acordar y retiro; el envío gratis sale desde el monto", async () => {
    const s = service();
    const { options } = await s.options("1414", 10_000_00);
    expect(options.map((o) => [o.method, o.cents, o.arranged ?? null])).toEqual([
      ["domicilio", 8_900_00, null],
      ["sucursal", 6_400_00, null],
      ["acordar", 0, { fromCents: null }],
      ["taller", 0, null],
    ]);
    expect(await s.cost("domicilio", "1414", 90_000_00)).toBe(0);
    expect(await s.cost("acordar", "1414", 10_000_00)).toBe(0);
  });

  it("sin envío gratis cobra el envío de Andreani aunque la compra sea grande", async () => {
    const s = service({ freeShipping: { enabled: false, fromCents: 90_000_00 } });
    expect(await s.cost("domicilio", "1414", 500_000_00)).toBe(8_900_00);
    expect(await s.freeShippingFrom()).toBeNull();
  });

  it("el cadete aparece solo en la ciudad del taller y no se cobra en la web", async () => {
    const s = service();
    const cadete = (await s.options("4000", 0)).options.find((o) => o.method === "cadete");
    expect(cadete).toMatchObject({
      label: "Cadete en San Miguel de Tucumán",
      cents: 0,
      arranged: { fromCents: 3_000_00 },
    });
    expect((await s.options("4107", 0)).options.some((o) => o.method === "cadete")).toBe(false);
    expect(await s.cost("cadete", "4000", 10_000_00)).toBe(0);
    await expect(s.checkDelivery({ method: "cadete", postalCode: "4107" })).rejects.toThrow(
      "El cadete llega solo dentro de San Miguel de Tucumán",
    );
    await expect(s.checkDelivery({ method: "cadete", postalCode: "4000" })).resolves.toBeUndefined();
  });

  it("si Andreani no cotiza no hay precio inventado: no se puede cerrar con Andreani", async () => {
    const policies = { get: async () => DEFAULT_POLICIES };
    const down = { available: true, quote: async () => null };
    const s = new ShippingService(down, clock, null, policies);
    const domicilio = (await s.options("1414", 0)).options.find((o) => o.method === "domicilio");
    expect(domicilio).toMatchObject({ cents: null, detail: expect.stringContaining("Andreani no respondió") });
    await expect(s.charge("domicilio", "1414", 0)).rejects.toThrow("Andreani no pudo cotizar");
    expect(await s.charge("acordar", "1414", 0)).toBe(0);
  });

  it("sin Andreani conectado (producción sin credenciales) no se ofrece ni se acepta", async () => {
    const policies = { get: async () => DEFAULT_POLICIES };
    const s = new ShippingService({ available: false, quote: async () => null }, clock, null, policies);
    expect((await s.options("4000", 0)).options.map((o) => o.method)).toEqual(["acordar", "taller", "cadete"]);
    await expect(s.checkDelivery({ method: "domicilio", postalCode: "1414" })).rejects.toThrow(
      "Esa forma de entrega ya no está disponible",
    );
  });

  it("solo ofrece las formas de entrega prendidas y rechaza las apagadas", async () => {
    const s = service({ methods: { domicilio: true, sucursal: false, acordar: false, taller: false, cadete: false } });
    const r = await s.options("4000", 0);
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

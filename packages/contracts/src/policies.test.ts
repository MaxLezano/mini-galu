import { describe, expect, it } from "vitest";
import {
  DEFAULT_POLICIES,
  deliverySummary,
  freeShippingLabel,
  localDeliveryFor,
  parseCpRanges,
  parsePickupDay,
  pickupHoursLabel,
  qualifiesForFreeShipping,
  type StorePolicies,
  StorePoliciesSchema,
  whatsappUrl,
  withDefaults,
} from "./policies";

const with_ = (p: Partial<StorePolicies>): StorePolicies => ({ ...DEFAULT_POLICIES, ...p });

describe("políticas de la tienda", () => {
  it("las de base son válidas", () => {
    expect(StorePoliciesSchema.safeParse(DEFAULT_POLICIES).success).toBe(true);
  });

  it("lee los códigos postales como los escribe Gaby", () => {
    expect(parseCpRanges("4000-4199, 5300 a 5399 y 4700")).toEqual([
      [4000, 4199],
      [5300, 5399],
      [4700, 4700],
    ]);
    expect(parseCpRanges("")).toEqual([]);
    expect(parseCpRanges("Tucumán")).toBeNull();
    expect(parseCpRanges("4199-4000")).toBeNull();
  });

  it("la cadetería llega solo a sus códigos postales y si está prendida", () => {
    expect(localDeliveryFor(DEFAULT_POLICIES, "4000")?.fromCents).toBe(3_000_00);
    expect(localDeliveryFor(DEFAULT_POLICIES, "4107")).toBeNull();
    const off = with_({ methods: { ...DEFAULT_POLICIES.methods, cadete: false } });
    expect(localDeliveryFor(off, "4000")).toBeNull();
    const sinCp = with_({ localDelivery: { cps: "", fromCents: 3_000_00 } });
    expect(StorePoliciesSchema.safeParse(sinCp).error?.issues[0]?.message).toBe(
      "Poné los códigos postales de la cadetería",
    );
  });

  it("lo guardado antes se completa con la base y las tablas de precios por zona se descartan", () => {
    const old = {
      exchangeDays: 5,
      methods: { domicilio: true, sucursal: false, taller: true },
      rates: { amba: { domicilioCents: 1, sucursalCents: 2, days: "1" } },
      zones: [{ title: "Tucumán" }],
      localDelivery: { enabled: false, cps: "4000", fromCents: 2_000_00 },
    };
    const p = withDefaults(old);
    expect(p.exchangeDays).toBe(5);
    expect(p.methods).toEqual({ domicilio: true, sucursal: false, acordar: true, taller: true, cadete: false });
    expect(p.localDelivery).toEqual({ cps: "4000", fromCents: 2_000_00 });
    expect("rates" in p || "zones" in p).toBe(false);
    expect(StorePoliciesSchema.safeParse(p).success).toBe(true);
    expect(withDefaults(null)).toEqual(DEFAULT_POLICIES);
  });

  it("resume las formas de entrega prendidas", () => {
    expect(deliverySummary(DEFAULT_POLICIES)).toBe(
      "Envíos a todo el país con Andreani (a domicilio o a sucursal), envío a acordar por WhatsApp, cadete en San Miguel de Tucumán desde $3.000 o retiro gratis en el taller de San Miguel de Tucumán.",
    );
    const solo = with_({
      methods: { domicilio: false, sucursal: true, acordar: false, taller: true, cadete: false },
    });
    expect(deliverySummary(solo)).toBe(
      "Envíos a todo el país con Andreani (a sucursal) o retiro gratis en el taller de San Miguel de Tucumán.",
    );
  });

  it("arma el WhatsApp de la tienda", () => {
    expect(whatsappUrl("381 319-5264")).toBe("https://wa.me/5493813195264");
    expect(whatsappUrl("+54 9 381 319-5264", "hola ✿")).toBe("https://wa.me/5493813195264?text=hola%20%E2%9C%BF");
  });

  it("el envío gratis se puede apagar (en la base está apagado)", () => {
    const on = with_({ freeShipping: { enabled: true, fromCents: 90_000_00 } });
    expect(qualifiesForFreeShipping(on, 90_000_00)).toBe(true);
    expect(qualifiesForFreeShipping(on, 89_999_00)).toBe(false);
    expect(freeShippingLabel(on)).toBe("Envío gratis desde $90.000");
    expect(qualifiesForFreeShipping(DEFAULT_POLICIES, 500_000_00)).toBe(false);
    expect(freeShippingLabel(DEFAULT_POLICIES)).toBeNull();
  });

  it("pide al menos una forma de entrega y horarios si hay retiro", () => {
    const none = with_({
      methods: { domicilio: false, sucursal: false, acordar: false, taller: false, cadete: false },
    });
    expect(StorePoliciesSchema.safeParse(none).error?.issues[0]?.message).toBe("Dejá al menos una forma de entrega");
    const closed = with_({ pickupHours: [[], [], [], [], [], [], []] });
    expect(StorePoliciesSchema.safeParse(closed).error?.issues[0]?.message).toBe("Poné al menos un horario de retiro");
    const noPickup = with_({ ...closed, methods: { ...DEFAULT_POLICIES.methods, taller: false } });
    expect(StorePoliciesSchema.safeParse(noPickup).success).toBe(true);
  });

  it("lee las franjas de retiro como las escribe Gaby", () => {
    expect(parsePickupDay("10 a 13, 16 a 19")).toEqual([
      [10, 13],
      [16, 19],
    ]);
    expect(parsePickupDay("10-13 y 16:00 a 19 hs")).toEqual([
      [10, 13],
      [16, 19],
    ]);
    expect(parsePickupDay("  ")).toEqual([]);
    expect(parsePickupDay("13 a 10")).toBeNull();
    expect(parsePickupDay("a la tarde")).toBeNull();
  });

  it("resume los horarios agrupando días seguidos", () => {
    expect(pickupHoursLabel(DEFAULT_POLICIES)).toBe("Lun a vie · 10 a 13 y 16 a 19 h · Sáb · 10 a 13 h");
  });
});

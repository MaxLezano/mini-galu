import { describe, expect, it } from "vitest";
import {
  DEFAULT_POLICIES,
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
  zoneOf,
  zoneQuote,
} from "./policies";

const with_ = (p: Partial<StorePolicies>): StorePolicies => ({ ...DEFAULT_POLICIES, ...p });

describe("políticas de la tienda", () => {
  it("las de base son válidas", () => {
    expect(StorePoliciesSchema.safeParse(DEFAULT_POLICIES).success).toBe(true);
  });

  it("ubica el CP en su zona (las de base, desde el taller de Tucumán)", () => {
    const zone = (cp: string) => zoneOf(DEFAULT_POLICIES, cp).title;
    expect(zone("T4000")).toBe("Tucumán");
    expect(zone("4107")).toBe("Tucumán");
    expect(zone("4600")).toBe("Noroeste");
    expect(zone("5300")).toBe("Noroeste");
    expect(zone("1414")).toBe("Resto del país");
    expect(zone("abc")).toBe("Resto del país");
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

  it("cotiza con la tabla de la zona", () => {
    const q = zoneQuote(DEFAULT_POLICIES, "4000");
    expect(q.domicilio).toEqual({ cents: 5_900_00, detail: "Llega en 2 a 3 días hábiles" });
    expect(q.sucursal.cents).toBe(4_248_00);
  });

  it("la cadetería llega solo a sus códigos postales y si está prendida", () => {
    expect(localDeliveryFor(DEFAULT_POLICIES, "4000")?.fromCents).toBe(3_000_00);
    expect(localDeliveryFor(DEFAULT_POLICIES, "4107")).toBeNull();
    const off = with_({ localDelivery: { ...DEFAULT_POLICIES.localDelivery, enabled: false } });
    expect(localDeliveryFor(off, "4000")).toBeNull();
    const sinCp = with_({ localDelivery: { enabled: true, cps: "", fromCents: 3_000_00 } });
    expect(StorePoliciesSchema.safeParse(sinCp).error?.issues[0]?.message).toBe(
      "Poné los códigos postales de la cadetería",
    );
  });

  it("lo guardado antes de los ajustes nuevos se completa y la tabla vieja pasa a las zonas nuevas", () => {
    const old = {
      exchangeDays: 5,
      rates: {
        amba: { domicilioCents: 1, sucursalCents: 2, days: "1" },
        centro: { domicilioCents: 3, sucursalCents: 4, days: "2" },
        resto: { domicilioCents: 5, sucursalCents: 6, days: "3" },
      },
    };
    const p = withDefaults(old);
    expect(p.exchangeDays).toBe(5);
    expect(p.zones.map((z) => [z.title, z.domicilioCents])).toEqual([
      ["Tucumán", 1],
      ["Noroeste", 3],
      ["Resto del país", 5],
    ]);
    expect(p.contact).toEqual(DEFAULT_POLICIES.contact);
    expect("rates" in p).toBe(false);
    expect(StorePoliciesSchema.safeParse(p).success).toBe(true);
    expect(withDefaults(null)).toEqual(DEFAULT_POLICIES);
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
    const none = with_({ methods: { domicilio: false, sucursal: false, taller: false } });
    expect(StorePoliciesSchema.safeParse(none).error?.issues[0]?.message).toBe("Dejá al menos una forma de entrega");
    const closed = with_({ pickupHours: [[], [], [], [], [], [], []] });
    expect(StorePoliciesSchema.safeParse(closed).error?.issues[0]?.message).toBe("Poné al menos un horario de retiro");
    const noPickup = with_({ ...closed, methods: { domicilio: true, sucursal: true, taller: false } });
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

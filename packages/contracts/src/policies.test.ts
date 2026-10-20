import { describe, expect, it } from "vitest";
import {
  DEFAULT_POLICIES,
  freeShippingLabel,
  parsePickupDay,
  pickupHoursLabel,
  qualifiesForFreeShipping,
  type StorePolicies,
  StorePoliciesSchema,
  zoneOf,
  zoneQuote,
} from "./policies";

const with_ = (p: Partial<StorePolicies>): StorePolicies => ({ ...DEFAULT_POLICIES, ...p });

describe("políticas de la tienda", () => {
  it("las de base son válidas", () => {
    expect(StorePoliciesSchema.safeParse(DEFAULT_POLICIES).success).toBe(true);
  });

  it("ubica el CP en su zona", () => {
    expect(zoneOf("C1414")).toBe("amba");
    expect(zoneOf("1899")).toBe("amba");
    expect(zoneOf("2000")).toBe("centro");
    expect(zoneOf("5000")).toBe("resto");
    expect(zoneOf("abc")).toBe("resto");
  });

  it("cotiza con la tabla de la zona", () => {
    const q = zoneQuote(DEFAULT_POLICIES, "1414");
    expect(q.domicilio).toEqual({ cents: 5_900_00, detail: "Llega en 2 a 3 días hábiles" });
    expect(q.sucursal.cents).toBe(4_248_00);
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

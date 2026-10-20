import { DEFAULT_POLICIES } from "@mini-galu/contracts";
import { describe, expect, it } from "vitest";
import { fromForm, toForm } from "./policies-form";

describe("policies-form", () => {
  it("ida y vuelta sin perder nada", () => {
    const f = toForm(DEFAULT_POLICIES);
    expect(f.freeFrom).toBe("90.000");
    expect(f.pickup[1]).toBe("10 a 13, 16 a 19");
    expect(f.pickup[0]).toBe("");
    expect(fromForm(f)).toEqual({ policies: DEFAULT_POLICIES });
  });

  it("lee montos con o sin puntos y franjas escritas a mano", () => {
    const f = toForm(DEFAULT_POLICIES);
    const r = fromForm({
      ...f,
      exchangeDays: "15",
      freeEnabled: true,
      freeFrom: "$120000",
      rates: { ...f.rates, amba: { domicilio: "6.500", sucursal: "4500", days: "1 a 2" } },
      pickup: ["", "9-12", "", "", "", "", ""],
    });
    expect("policies" in r && r.policies).toMatchObject({
      exchangeDays: 15,
      freeShipping: { enabled: true, fromCents: 120_000_00 },
      rates: { amba: { domicilioCents: 6_500_00, sucursalCents: 4_500_00, days: "1 a 2" } },
      pickupHours: [[], [[9, 12]], [], [], [], [], []],
    });
  });

  it("dice qué campo corregir", () => {
    const f = toForm(DEFAULT_POLICIES);
    expect(fromForm({ ...f, pickup: ["", "a la tarde", "", "", "", "", ""] })).toMatchObject({ field: "pol-pickup-1" });
    expect(fromForm({ ...f, exchangeDays: "" })).toMatchObject({ field: "pol-days" });
    expect(fromForm({ ...f, rates: { ...f.rates, centro: { ...f.rates.centro, sucursal: "" } } })).toEqual({
      field: "pol-centro-sucursal",
      message: "Poné el precio a sucursal",
    });
    expect(fromForm({ ...f, methods: { domicilio: false, sucursal: false, taller: false } })).toEqual({
      field: "pol-domicilio",
      message: "Dejá al menos una forma de entrega",
    });
  });
});

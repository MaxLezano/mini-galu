import { DEFAULT_POLICIES } from "@mini-galu/contracts";
import { describe, expect, it } from "vitest";
import { fromForm, toForm } from "./policies-form";

const delivery = () => {
  const { exchangeDays, freeShipping, methods, localDelivery, pickupHours } = DEFAULT_POLICIES;
  return { exchangeDays, freeShipping, methods, localDelivery, pickupHours };
};

describe("policies-form", () => {
  it("ida y vuelta sin perder nada (y solo manda lo de entregas)", () => {
    const f = toForm(DEFAULT_POLICIES);
    expect(f.freeFrom).toBe("90.000");
    expect(f.methods).toEqual({ domicilio: true, sucursal: true, acordar: true, taller: true, cadete: true });
    expect(f.local).toEqual({ cps: "4000", from: "3.000" });
    expect(f.pickup[1]).toBe("10 a 13, 16 a 19");
    expect(f.pickup[0]).toBe("");
    expect(fromForm(f, DEFAULT_POLICIES)).toEqual({ policies: delivery() });
  });

  it("lee montos con o sin puntos, franjas y códigos postales escritos a mano", () => {
    const f = toForm(DEFAULT_POLICIES);
    const r = fromForm(
      {
        ...f,
        exchangeDays: "15",
        freeEnabled: true,
        freeFrom: "$120000",
        local: { cps: "4000, 4107-4109", from: "$ 3.500" },
        pickup: ["", "9-12", "", "", "", "", ""],
      },
      DEFAULT_POLICIES,
    );
    expect("policies" in r && r.policies).toMatchObject({
      exchangeDays: 15,
      freeShipping: { enabled: true, fromCents: 120_000_00 },
      localDelivery: { cps: "4000, 4107-4109", fromCents: 3_500_00 },
      pickupHours: [[], [[9, 12]], [], [], [], [], []],
    });
  });

  it("dice qué campo corregir", () => {
    const f = toForm(DEFAULT_POLICIES);
    expect(fromForm({ ...f, pickup: ["", "a la tarde", "", "", "", "", ""] }, DEFAULT_POLICIES)).toMatchObject({
      field: "pol-pickup-1",
    });
    expect(fromForm({ ...f, exchangeDays: "" }, DEFAULT_POLICIES)).toMatchObject({ field: "pol-days" });
    expect(fromForm({ ...f, local: { ...f.local, cps: "Tucumán" } }, DEFAULT_POLICIES)).toEqual({
      field: "pol-local-cps",
      message: "Escribí los códigos postales así: 4000-4199, 4700",
    });
    // sin cadete prendido, los códigos postales vacíos no importan
    const off = { ...f, methods: { ...f.methods, cadete: false }, local: { ...f.local, cps: "" } };
    expect("policies" in fromForm(off, DEFAULT_POLICIES)).toBe(true);
    expect(
      fromForm(
        { ...f, methods: { domicilio: false, sucursal: false, acordar: false, taller: false, cadete: false } },
        DEFAULT_POLICIES,
      ),
    ).toEqual({ field: "pol-domicilio", message: "Dejá al menos una forma de entrega" });
  });
});

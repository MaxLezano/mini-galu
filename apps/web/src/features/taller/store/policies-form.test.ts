import { DEFAULT_POLICIES } from "@mini-galu/contracts";
import { describe, expect, it } from "vitest";
import { fromForm, toForm } from "./policies-form";

const delivery = () => {
  const { exchangeDays, freeShipping, methods, zones, localDelivery, pickupHours } = DEFAULT_POLICIES;
  return { exchangeDays, freeShipping, methods, zones, localDelivery, pickupHours };
};

describe("policies-form", () => {
  it("ida y vuelta sin perder nada (y solo manda lo de entregas)", () => {
    const f = toForm(DEFAULT_POLICIES);
    expect(f.freeFrom).toBe("90.000");
    expect(f.local).toEqual({ enabled: true, cps: "4000", from: "3.000" });
    expect(f.zones[0]).toMatchObject({ title: "Tucumán", cps: "4000-4199", domicilio: "5.900" });
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
        zones: f.zones.map((z, i) =>
          i === 0 ? { ...z, title: "Gran Tucumán", cps: "4000 a 4199, 4107", domicilio: "6.500", sucursal: "4500" } : z,
        ),
        local: { enabled: true, cps: "4000", from: "$ 3.500" },
        pickup: ["", "9-12", "", "", "", "", ""],
      },
      DEFAULT_POLICIES,
    );
    expect("policies" in r && r.policies).toMatchObject({
      exchangeDays: 15,
      freeShipping: { enabled: true, fromCents: 120_000_00 },
      localDelivery: { fromCents: 3_500_00 },
      pickupHours: [[], [[9, 12]], [], [], [], [], []],
    });
    expect("policies" in r && r.policies.zones[0]).toMatchObject({
      title: "Gran Tucumán",
      cps: "4000 a 4199, 4107",
      domicilioCents: 6_500_00,
      sucursalCents: 4_500_00,
    });
  });

  it("la última zona es el resto del país: no guarda códigos postales", () => {
    const f = toForm(DEFAULT_POLICIES);
    const r = fromForm({ ...f, zones: f.zones.map((z, i) => (i === 2 ? { ...z, cps: "9000" } : z)) }, DEFAULT_POLICIES);
    expect("policies" in r && r.policies.zones[2]?.cps).toBe("");
  });

  it("dice qué campo corregir", () => {
    const f = toForm(DEFAULT_POLICIES);
    expect(fromForm({ ...f, pickup: ["", "a la tarde", "", "", "", "", ""] }, DEFAULT_POLICIES)).toMatchObject({
      field: "pol-pickup-1",
    });
    expect(fromForm({ ...f, exchangeDays: "" }, DEFAULT_POLICIES)).toMatchObject({ field: "pol-days" });
    expect(
      fromForm({ ...f, zones: f.zones.map((z, i) => (i === 1 ? { ...z, sucursal: "" } : z)) }, DEFAULT_POLICIES),
    ).toEqual({ field: "pol-zone-1-sucursal", message: "Poné el precio a sucursal" });
    expect(
      fromForm({ ...f, zones: f.zones.map((z, i) => (i === 0 ? { ...z, cps: "Tucumán" } : z)) }, DEFAULT_POLICIES),
    ).toEqual({ field: "pol-zone-0-cps", message: "Escribí los códigos postales así: 4000-4199, 4700" });
    expect(fromForm({ ...f, local: { ...f.local, cps: "" } }, DEFAULT_POLICIES)).toMatchObject({
      field: "pol-local-cps",
    });
    expect(fromForm({ ...f, methods: { domicilio: false, sucursal: false, taller: false } }, DEFAULT_POLICIES)).toEqual(
      {
        field: "pol-domicilio",
        message: "Dejá al menos una forma de entrega",
      },
    );
  });
});

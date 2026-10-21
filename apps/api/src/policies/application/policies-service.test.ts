import { DEFAULT_POLICIES } from "@mini-galu/contracts";
import { describe, expect, it } from "vitest";
import { MemoryPolicies } from "../testing/in-memory";
import { PoliciesService } from "./policies-service";

describe("PoliciesService", () => {
  it("sin nada guardado rigen las de base", async () => {
    expect(await new PoliciesService(new MemoryPolicies()).get()).toEqual(DEFAULT_POLICIES);
  });

  it("guarda lo que edita Gaby", async () => {
    const store = new MemoryPolicies();
    const service = new PoliciesService(store);
    await service.save({ ...DEFAULT_POLICIES, exchangeDays: 15 });
    expect((await service.get()).exchangeDays).toBe(15);
  });

  it("cada caja guarda solo lo suyo sin pisar lo demás", async () => {
    const service = new PoliciesService(new MemoryPolicies());
    await service.save({ exchangeDays: 15 });
    await service.save({ giftcardMonths: 3 });
    const p = await service.get();
    expect([p.exchangeDays, p.giftcardMonths]).toEqual([15, 3]);
  });

  it("lo guardado con las tablas viejas de zonas sigue valiendo, sin esos precios (no vuelve a la base)", async () => {
    const old = {
      ...DEFAULT_POLICIES,
      exchangeDays: 7,
      methods: { domicilio: true, sucursal: true, taller: true },
      rates: { amba: { domicilioCents: 1_00, sucursalCents: 2_00, days: "1" } },
      localDelivery: { enabled: false, cps: "4000", fromCents: 3_000_00 },
    };
    const p = await new PoliciesService(new MemoryPolicies(old)).get();
    expect(p.exchangeDays).toBe(7);
    expect(p.methods).toMatchObject({ acordar: true, cadete: false });
    expect("rates" in p).toBe(false);
  });

  it("el CUIT es el de ARCA: se completa al leer y no se edita", async () => {
    const service = new PoliciesService(new MemoryPolicies(), "27123456789");
    expect((await service.get()).fiscal.cuit).toBe("27123456789");
    const saved = await service.save({ fiscal: { ...DEFAULT_POLICIES.fiscal, name: "Gabriela", cuit: "20999999999" } });
    expect(saved.fiscal).toMatchObject({ name: "Gabriela", cuit: "27123456789" });
    expect((await new PoliciesService(new MemoryPolicies()).get()).fiscal.cuit).toBe("");
  });

  it("no guarda políticas sin ninguna forma de entrega", async () => {
    const service = new PoliciesService(new MemoryPolicies());
    await expect(
      service.save({
        ...DEFAULT_POLICIES,
        methods: { domicilio: false, sucursal: false, acordar: false, taller: false, cadete: false },
      }),
    ).rejects.toThrow("Dejá al menos una forma de entrega");
  });
});

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

  it("lo guardado con la tabla vieja de zonas sigue valiendo (no vuelve a la base)", async () => {
    const { zones: _z, ...rest } = DEFAULT_POLICIES;
    const old = {
      ...rest,
      exchangeDays: 7,
      rates: {
        amba: { domicilioCents: 1_00, sucursalCents: 2_00, days: "1" },
        centro: { domicilioCents: 3_00, sucursalCents: 4_00, days: "2" },
        resto: { domicilioCents: 5_00, sucursalCents: 6_00, days: "3" },
      },
    };
    const p = await new PoliciesService(new MemoryPolicies(old)).get();
    expect(p.exchangeDays).toBe(7);
    expect(p.zones[0]).toMatchObject({ title: "Tucumán", domicilioCents: 1_00 });
  });

  it("no guarda políticas sin ninguna forma de entrega", async () => {
    const service = new PoliciesService(new MemoryPolicies());
    await expect(
      service.save({ ...DEFAULT_POLICIES, methods: { domicilio: false, sucursal: false, taller: false } }),
    ).rejects.toThrow("Dejá al menos una forma de entrega");
  });
});

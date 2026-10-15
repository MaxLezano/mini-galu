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

  it("no guarda políticas sin ninguna forma de entrega", async () => {
    const service = new PoliciesService(new MemoryPolicies());
    await expect(
      service.save({ ...DEFAULT_POLICIES, methods: { domicilio: false, sucursal: false, taller: false } }),
    ).rejects.toThrow("Dejá al menos una forma de entrega");
  });
});

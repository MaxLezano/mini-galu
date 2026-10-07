import { type CouponInput, CouponInputSchema } from "@mini-galu/contracts";
import { beforeEach, describe, expect, it } from "vitest";
import { ConflictError } from "../../shared/domain/errors";
import { MemoryCoupons } from "../testing/in-memory";
import { CouponService } from "./coupon-service";

const NOW = new Date("2026-10-07T12:00:00-03:00");
const input = (over: Partial<CouponInput> = {}) =>
  CouponInputSchema.parse({ code: "PRIMAVERA15", kind: "percent", value: 15, ...over });

let repo: MemoryCoupons;
let coupons: CouponService;

beforeEach(() => {
  repo = new MemoryCoupons();
  coupons = new CouponService(repo, () => NOW);
});

const ok = async (code: string, subtotal: number, email: string | null = "lucia@gmail.com") => {
  const r = await coupons.check(code, subtotal, email);
  if (!r.coupon) throw new Error(r.reason);
  return r.result;
};

describe("CouponService", () => {
  it("porcentaje sobre el subtotal, sin importar mayúsculas ni espacios", async () => {
    await coupons.create(input());
    expect(await ok(" primavera15 ", 100_000_00)).toEqual({ ok: true, discountCents: 15_000_00, freeShipping: false });
  });

  it("monto fijo nunca deja el subtotal negativo", async () => {
    await coupons.create(input({ code: "MIL", kind: "fixed", value: 50_000_00 }));
    expect(await ok("MIL", 30_000_00)).toMatchObject({ discountCents: 30_000_00 });
  });

  it("envío gratis", async () => {
    await coupons.create(input({ code: "ENVIO", kind: "free_shipping", value: 0 }));
    expect(await ok("ENVIO", 10_000_00)).toEqual({ ok: true, discountCents: 0, freeShipping: true });
  });

  it("código inexistente, pausado, vencido, mínimo y usos", async () => {
    expect(await coupons.check("NADA", 1, null)).toEqual({ coupon: null, reason: "Ese código no existe" });
    await coupons.create(input({ code: "PAUSA", active: false }));
    await coupons.create(input({ code: "VIEJO", endsAt: "2026-10-01T00:00:00-03:00" }));
    await coupons.create(input({ code: "MINIMO", minSubtotalCents: 50_000_00 }));
    await coupons.create(input({ code: "UNO", maxUses: 1, oncePerCustomer: false }));
    expect(await ok("PAUSA", 1)).toMatchObject({ ok: false, reason: expect.stringContaining("pausado") });
    expect(await ok("VIEJO", 1)).toMatchObject({ ok: false, reason: expect.stringContaining("venció") });
    expect(await ok("MINIMO", 49_999_00)).toMatchObject({ ok: false, reason: expect.stringContaining("$50.000") });
    const uno = await repo.findByCode("UNO");
    await coupons.redeem(uno?.id as string, "o1", "otra@gmail.com");
    expect(await ok("UNO", 1)).toMatchObject({ ok: false, reason: expect.stringContaining("todas las veces") });
  });

  it("un uso por cliente y canje idempotente por pedido", async () => {
    const c = await coupons.create(input());
    expect(await coupons.redeem(c.id, "o1", "lucia@gmail.com")).toBe(true);
    expect(await coupons.redeem(c.id, "o1", "lucia@gmail.com")).toBe(false);
    expect((await repo.findById(c.id))?.timesUsed).toBe(1);
    expect(await ok("PRIMAVERA15", 1)).toMatchObject({ ok: false, reason: "Ya usaste este cupón" });
    expect(await ok("PRIMAVERA15", 1, "otra@gmail.com")).toMatchObject({ ok: true });
  });

  it("primera compra y anotados al lanzamiento", async () => {
    await coupons.create(input({ code: "BIENVENIDA", audience: "primera_compra" }));
    await coupons.create(input({ code: "ANOTADAS", audience: "anotados" }));
    repo.paidEmails.add("lucia@gmail.com");
    repo.signups.add("lucia@gmail.com");
    expect(await ok("BIENVENIDA", 1)).toMatchObject({ ok: false });
    expect(await ok("BIENVENIDA", 1, "nueva@gmail.com")).toMatchObject({ ok: true });
    expect(await ok("ANOTADAS", 1)).toMatchObject({ ok: true });
    expect(await ok("ANOTADAS", 1, "nueva@gmail.com")).toMatchObject({ ok: false });
  });

  it("no repite códigos", async () => {
    await coupons.create(input());
    await expect(coupons.create(input())).rejects.toBeInstanceOf(ConflictError);
    const other = await coupons.create(input({ code: "OTRO" }));
    await expect(coupons.update(other.id, input())).rejects.toBeInstanceOf(ConflictError);
  });
});

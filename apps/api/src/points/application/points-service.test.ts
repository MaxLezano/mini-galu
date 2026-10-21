import { DEFAULT_POLICIES, type ReviewPoints } from "@mini-galu/contracts";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryPoints, MemoryPointsCoupons } from "../testing/in-memory";
import { PointsService } from "./points-service";

const LUCIA = "lucia@gmail.com";

describe("PointsService", () => {
  let repo: MemoryPoints;
  let coupons: MemoryPointsCoupons;
  let rules: ReviewPoints;
  let svc: PointsService;
  beforeEach(() => {
    repo = new MemoryPoints();
    coupons = new MemoryPointsCoupons(repo);
    rules = { ...DEFAULT_POLICIES.reviewPoints };
    svc = new PointsService(repo, coupons, async () => rules);
    for (let i = 1; i <= 6; i++) repo.owners.set(`r${i}`, { email: LUCIA, hasPhoto: i <= 4 });
  });

  it("una reseña publicada suma al mail del pedido, más con foto, y una sola vez", async () => {
    expect(await svc.reviewPublished("r1")).toBe(20);
    expect(await svc.reviewPublished("r1")).toBe(0);
    expect(await svc.reviewPublished("r5")).toBe(10);
    expect((await svc.summary(LUCIA)).balance).toBe(30);
  });

  it("las reseñas demo (sin pedido) y los puntos apagados no suman", async () => {
    expect(await svc.reviewPublished("demo")).toBe(0);
    rules = { ...rules, enabled: false };
    expect(await svc.reviewPublished("r1")).toBe(0);
    expect(repo.entries).toEqual([]);
  });

  it("canjea el umbral por un cupón personal y descuenta los puntos", async () => {
    for (const r of ["r1", "r2", "r3", "r4", "r5", "r6"]) await svc.reviewPublished(r);
    expect((await svc.summary(LUCIA)).balance).toBe(100);
    const s = await svc.redeem(LUCIA);
    expect(s.balance).toBe(0);
    expect(s.coupons).toEqual([
      { code: "PUNTOS-1", label: "10% de descuento", endsAt: new Date(60 * 86_400_000).toISOString(), used: false },
    ]);
  });

  it("sin puntos suficientes o con los puntos apagados no canjea", async () => {
    await svc.reviewPublished("r1");
    await expect(svc.redeem(LUCIA)).rejects.toThrow("Te faltan puntos");
    rules = { ...rules, enabled: false, threshold: 10 };
    await expect(svc.redeem(LUCIA)).rejects.toThrow("no se pueden canjear");
    expect(repo.issued.size).toBe(0);
  });

  it("si el cupón no se pudo generar, devuelve los puntos", async () => {
    rules = { ...rules, threshold: 20 };
    await svc.reviewPublished("r1");
    coupons.fail = true;
    await expect(svc.redeem(LUCIA)).rejects.toThrow("sin cupón");
    expect((await svc.summary(LUCIA)).balance).toBe(20);
  });
});

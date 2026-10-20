import { beforeEach, describe, expect, it } from "vitest";
import { isBot } from "../domain/launch";
import type { LaunchVisitRepository, LaunchVisitTarget } from "./launch-ports";
import { LaunchVisitsService } from "./launch-visits-service";

type Launch = { id: string; startsAt: Date; publishedAt: Date | null; products: string[] };

class MemoryVisits implements LaunchVisitRepository {
  launches: Launch[] = [];
  rows: { launchId: string; day: string; visitor: string }[] = [];
  async findPreview(t: LaunchVisitTarget) {
    if ("launchId" in t) return this.launches.find((l) => l.id === t.launchId) ?? null;
    return this.launches.find((l) => !l.publishedAt && l.products.includes(t.productSlug)) ?? null;
  }
  async add(launchId: string, day: string, visitor: string) {
    if (this.rows.some((r) => r.launchId === launchId && r.day === day && r.visitor === visitor)) return false;
    this.rows.push({ launchId, day, visitor });
    return true;
  }
}

let repo: MemoryVisits;
let clock: Date;
let service: LaunchVisitsService;

beforeEach(() => {
  repo = new MemoryVisits();
  repo.launches = [
    { id: "l1", startsAt: new Date("2026-10-30T10:00:00-03:00"), publishedAt: null, products: ["corazon-pana"] },
  ];
  clock = new Date("2026-10-19T20:00:00-03:00");
  service = new LaunchVisitsService(
    repo,
    (v) => `hash(${v})`,
    () => clock,
  );
});

describe("LaunchVisitsService", () => {
  it("cuenta una visita por visitante y día, desde la home o la ficha", async () => {
    expect(await service.record({ launchId: "l1" }, "1.2.3.4|Safari")).toBe(true);
    expect(await service.record({ productSlug: "corazon-pana" }, "1.2.3.4|Safari")).toBe(false);
    expect(await service.record({ launchId: "l1" }, "5.6.7.8|Chrome")).toBe(true);
    clock = new Date("2026-10-20T09:00:00-03:00");
    expect(await service.record({ launchId: "l1" }, "1.2.3.4|Safari")).toBe(true);
    expect(repo.rows.map((r) => r.day)).toEqual(["2026-10-19", "2026-10-19", "2026-10-20"]);
  });

  it("el día es el de Argentina y el visitante se guarda como hash (con el día adentro)", async () => {
    clock = new Date("2026-10-20T01:30:00Z"); // 22:30 del 19 en Buenos Aires
    await service.record({ launchId: "l1" }, "1.2.3.4|Safari");
    expect(repo.rows[0]).toEqual({ launchId: "l1", day: "2026-10-19", visitor: "hash(2026-10-19|1.2.3.4|Safari)" });
  });

  it("no cuenta si el lanzamiento ya salió, no existe o la prenda no es de uno que viene", async () => {
    expect(await service.record({ productSlug: "elsa" }, "a")).toBe(false);
    expect(await service.record({ launchId: "nope" }, "a")).toBe(false);
    clock = new Date("2026-10-30T10:00:00-03:00");
    expect(await service.record({ launchId: "l1" }, "a")).toBe(false);
    clock = new Date("2026-10-25T10:00:00-03:00");
    repo.launches[0] = { ...(repo.launches[0] as Launch), publishedAt: new Date("2026-10-25T09:00:00-03:00") };
    expect(await service.record({ launchId: "l1" }, "a")).toBe(false);
    expect(repo.rows).toEqual([]);
  });
});

describe("isBot", () => {
  it("deja afuera buscadores y vistas previas de links", () => {
    expect(isBot("Mozilla/5.0 (compatible; Googlebot/2.1)")).toBe(true);
    expect(isBot("WhatsApp/2.23.20.0")).toBe(true);
    expect(isBot("facebookexternalhit/1.1")).toBe(true);
    expect(isBot(undefined)).toBe(true);
    expect(isBot("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Safari/604.1")).toBe(false);
  });
});

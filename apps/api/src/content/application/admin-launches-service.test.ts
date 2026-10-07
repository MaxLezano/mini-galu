import { type LaunchInput, LaunchInputSchema } from "@mini-galu/contracts";
import { beforeEach, describe, expect, it } from "vitest";
import { ConflictError, ValidationError } from "../../shared/domain/errors";
import { type DomainEvent, EventBus } from "../../shared/events/event-bus";
import type { ImageStorage } from "../../shared/media/image-storage";
import { AdminLaunchesService } from "./admin-launches-service";
import type { AdminLaunchRepository, LaunchRecord, ProductPublisher } from "./launch-ports";

const storage: ImageStorage = { url: (p) => `http://api/media/${p}`, save: async (p) => p };
const NOW = new Date("2026-10-07T12:00:00-03:00");

class MemoryRepo implements AdminLaunchRepository {
  items: LaunchRecord[] = [];
  products = ["corazon-pana", "elsa"];
  async findAll() {
    return this.items;
  }
  async findById(id: string) {
    return this.items.find((l) => l.id === id) ?? null;
  }
  async missingProducts(slugs: string[]) {
    return slugs.filter((s) => !this.products.includes(s));
  }
  async collectionExists(slug: string) {
    return slug === "otono-invierno-26";
  }
  async create(input: LaunchInput) {
    const id = `l${this.items.length + 1}`;
    this.items.push(this.toRecord(id, input, null));
    return id;
  }
  async update(id: string, input: LaunchInput) {
    const i = this.items.findIndex((l) => l.id === id);
    this.items[i] = this.toRecord(id, input, this.items[i]?.publishedAt ?? null);
  }
  async delete(id: string) {
    this.items = this.items.filter((l) => l.id !== id);
  }
  async markPublished(id: string, at: Date) {
    const l = this.items.find((x) => x.id === id);
    if (l) l.publishedAt = at;
  }
  private toRecord(id: string, i: LaunchInput, publishedAt: Date | null): LaunchRecord {
    return {
      id,
      title: i.title,
      coverNote: i.coverNote,
      teaser: i.teaser,
      coverPath: i.coverPath,
      startsAt: new Date(i.startsAt),
      collectionSlug: i.collectionSlug,
      products: i.productSlugs.map((slug) => ({ slug, name: slug, imagePath: null, status: "draft" as const })),
      showCountdown: i.showCountdown,
      notifyBefore: i.notifyBefore,
      autoPublish: i.autoPublish,
      socialText: i.socialText,
      status: i.status,
      publishedAt,
      signups: 0,
    };
  }
}

const input = (over: Partial<LaunchInput> = {}): LaunchInput =>
  LaunchInputSchema.parse({
    title: "Otoño · Invierno 26",
    coverNote: "se viene el frío ♡",
    teaser: "Pana, escocés y lanas suaves.",
    coverPath: "content/hero-otono.webp",
    startsAt: "2026-10-18T10:00:00-03:00",
    collectionSlug: "otono-invierno-26",
    productSlugs: ["corazon-pana"],
    showCountdown: true,
    notifyBefore: true,
    autoPublish: true,
    socialText: null,
    status: "scheduled",
    ...over,
  });

let repo: MemoryRepo;
let clock: Date;
let published: string[][];
let events: DomainEvent[];
let service: AdminLaunchesService;

beforeEach(() => {
  repo = new MemoryRepo();
  clock = NOW;
  published = [];
  events = [];
  const bus = new EventBus();
  bus.on("LaunchPublished", (e) => {
    events.push(e);
  });
  const publisher: ProductPublisher = {
    publish: async (slugs) => {
      published.push(slugs);
      return { published: slugs, skipped: [] };
    },
  };
  service = new AdminLaunchesService(repo, publisher, storage, bus, () => clock);
});

describe("AdminLaunchesService", () => {
  it("programa a futuro y lo muestra como programado", async () => {
    const l = await service.create(input());
    expect(l.state).toBe("scheduled");
    expect(l.coverUrl).toBe("http://api/media/content/hero-otono.webp");
  });

  it("no programa en el pasado ni con prendas o colecciones inexistentes", async () => {
    await expect(service.create(input({ startsAt: "2026-10-01T10:00:00-03:00" }))).rejects.toBeInstanceOf(
      ValidationError,
    );
    await expect(service.create(input({ productSlugs: ["nada"] }))).rejects.toBeInstanceOf(ValidationError);
    await expect(service.create(input({ collectionSlug: "nada" }))).rejects.toBeInstanceOf(ValidationError);
    // un borrador sí puede tener cualquier fecha
    expect((await service.create(input({ status: "draft", startsAt: "2026-10-01T10:00:00-03:00" }))).state).toBe(
      "draft",
    );
  });

  it("publica las prendas solas cuando llega la hora, una sola vez", async () => {
    await service.create(input());
    await service.create(input({ title: "Sin auto", autoPublish: false }));
    expect(await service.publishDue()).toEqual([]);

    clock = new Date("2026-10-18T10:00:30-03:00");
    expect(await service.publishDue()).toEqual(["l1"]);
    expect(published).toEqual([["corazon-pana"]]);
    expect(events[0]?.payload).toMatchObject({ title: "Otoño · Invierno 26" });
    expect((await service.get("l1")).state).toBe("past");

    expect(await service.publishDue()).toEqual([]); // idempotente
  });

  it("solo se borran borradores", async () => {
    const l = await service.create(input());
    await expect(service.remove(l.id)).rejects.toBeInstanceOf(ConflictError);
    const d = await service.create(input({ status: "draft" }));
    await service.remove(d.id);
    expect(repo.items).toHaveLength(1);
  });

  it("para programar pide prendas y portada", () => {
    expect(LaunchInputSchema.safeParse({ ...input(), productSlugs: [] }).success).toBe(false);
    expect(LaunchInputSchema.safeParse({ ...input(), coverPath: null }).success).toBe(false);
    expect(
      LaunchInputSchema.safeParse({ ...input(), status: "draft", productSlugs: [], coverPath: null }).success,
    ).toBe(true);
  });
});

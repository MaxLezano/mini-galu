import { type ProductInput, ProductInputSchema } from "@mini-galu/contracts";
import { beforeEach, describe, expect, it } from "vitest";
import { NotFoundError, ValidationError } from "../../shared/domain/errors";
import { type DomainEvent, EventBus } from "../../shared/events/event-bus";
import type { ImageStorage } from "../../shared/media/image-storage";
import { InMemoryAdminProductRepository } from "../testing/in-memory-admin";
import { AdminCatalogService } from "./admin-catalog-service";

const storage: ImageStorage = {
  url: (p) => `http://api/media/${p}`,
  save: async (p) => p,
};

const input = (over: Partial<ProductInput> = {}): ProductInput =>
  ProductInputSchema.parse({
    name: "Vestido Elsa",
    description: "Lino salvia con volados.",
    collectionSlug: "verano-2027",
    color: { name: "Salvia", hex: "#8B9A7C" },
    fabric: "Lino lavado",
    care: "",
    occasions: ["diario"],
    priceCents: 28_000_00,
    compareAtCents: null,
    tag: null,
    isAccessory: false,
    status: "published",
    images: [{ path: "products/elsa-1.webp", alt: "Vestido Elsa" }],
    variants: [
      { size: "4", stock: 2, measures: null },
      { size: "6", stock: 0, measures: null },
    ],
    ...over,
  });

let repo: InMemoryAdminProductRepository;
let events: DomainEvent[];
let service: AdminCatalogService;

beforeEach(() => {
  repo = new InMemoryAdminProductRepository();
  events = [];
  const bus = new EventBus();
  bus.on("StockReplenished", (e) => {
    events.push(e);
  });
  service = new AdminCatalogService(repo, storage, bus);
});

describe("AdminCatalogService", () => {
  it("crea con slug a partir del nombre, sin pisar uno existente", async () => {
    expect((await service.create(input())).product.slug).toBe("vestido-elsa");
    expect((await service.create(input())).product.slug).toBe("vestido-elsa-2");
  });

  it("rechaza colecciones inexistentes y prendas inexistentes", async () => {
    await expect(service.create(input({ collectionSlug: "nada" }))).rejects.toBeInstanceOf(ValidationError);
    await expect(service.update("nada", input())).rejects.toBeInstanceOf(NotFoundError);
  });

  it("al cargar stock de un talle con lista de espera, avisa (evento) y devuelve cuántas esperan", async () => {
    const { product } = await service.create(input());
    const id = repo.products[0]?.id ?? "";
    repo.waits.push({ productId: id, size: "6" }, { productId: id, size: "6" }, { productId: id, size: "8" });

    const r = await service.update(
      product.slug,
      input({
        variants: [
          { size: "4", stock: 2, measures: null },
          { size: "6", stock: 3, measures: null },
        ],
      }),
    );
    expect(r.replenished).toEqual([{ size: "6", waiting: 2 }]);
    expect(events).toHaveLength(1);
    expect(events[0]?.payload).toMatchObject({ slug: "vestido-elsa", sizes: [{ size: "6", waiting: 2 }] });
    expect(r.product.waitlist).toContainEqual({ size: "6", count: 2 });
  });

  it("en un borrador no dispara avisos", async () => {
    const { product } = await service.create(input({ status: "draft" }));
    repo.waits.push({ productId: repo.products[0]?.id ?? "", size: "6" });
    await service.update(product.slug, input({ status: "draft", variants: [{ size: "6", stock: 1, measures: null }] }));
    expect(events).toHaveLength(0);
  });

  it("no publica sin fotos", async () => {
    const { product } = await service.create(input({ status: "draft", images: [] }));
    await expect(service.setStatus(product.slug, "published")).rejects.toBeInstanceOf(ValidationError);
  });

  it("valida formato y peso de las fotos", async () => {
    await expect(service.uploadImage({ type: "image/gif", bytes: new Uint8Array(10) })).rejects.toBeInstanceOf(
      ValidationError,
    );
    await expect(
      service.uploadImage({ type: "image/webp", bytes: new Uint8Array(9 * 1024 * 1024) }),
    ).rejects.toBeInstanceOf(ValidationError);
    expect((await service.uploadImage({ type: "image/webp", bytes: new Uint8Array(10) })).path).toMatch(
      /^products\/.+\.webp$/,
    );
  });

  it("el contrato pide al menos una foto para publicar y precio anterior mayor al actual", () => {
    expect(ProductInputSchema.safeParse({ ...input(), images: [] }).success).toBe(false);
    expect(ProductInputSchema.safeParse({ ...input(), compareAtCents: 1_000_00 }).success).toBe(false);
  });
});

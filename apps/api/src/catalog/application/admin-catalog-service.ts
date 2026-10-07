import { randomUUID } from "node:crypto";
import {
  type ACCEPTED_IMAGE_TYPES,
  type AdminProduct,
  MAX_IMAGE_BYTES,
  type ProductInput,
  type ProductStatus,
  type SaveProductResult,
  type UploadResult,
} from "@mini-galu/contracts";
import { NotFoundError, ValidationError } from "../../shared/domain/errors";
import type { EventBus } from "../../shared/events/event-bus";
import type { ImageStorage } from "../../shared/media/image-storage";
import { replenishedSizes, slugify, uniqueSlug } from "../domain/admin";
import type { Product } from "../domain/product";
import type { AdminProductRepository, PendingWaitlist } from "./admin-ports";
import { toSummary } from "./presenters";

const EXT: Record<(typeof ACCEPTED_IMAGE_TYPES)[number], string> = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/avif": "avif",
};

/** Casos de uso del panel: productos, stock por talle, fotos y publicación. */
export class AdminCatalogService {
  constructor(
    private readonly repo: AdminProductRepository,
    private readonly storage: ImageStorage,
    private readonly events: EventBus,
  ) {}

  async list(): Promise<AdminProduct[]> {
    const all = await this.repo.findAll();
    const waits = await this.repo.pendingWaitlist(all.map((p) => p.id));
    return all.sort((a, b) => a.name.localeCompare(b.name, "es")).map((p) => this.present(p, waits));
  }

  async get(slug: string): Promise<AdminProduct> {
    const p = await this.mustFind(slug);
    return this.present(p, await this.repo.pendingWaitlist([p.id]));
  }

  async create(input: ProductInput): Promise<SaveProductResult> {
    await this.checkCollection(input.collectionSlug);
    const slug = uniqueSlug(slugify(input.name), await this.repo.slugs());
    await this.repo.create({ ...input, slug });
    return { product: await this.get(slug), replenished: [] };
  }

  async update(slug: string, input: ProductInput): Promise<SaveProductResult> {
    const before = await this.mustFind(slug);
    await this.checkCollection(input.collectionSlug);
    await this.repo.update(slug, { ...input, slug });

    const back = replenishedSizes(before.variants, input.variants);
    const waits = await this.repo.pendingWaitlist([before.id]);
    const replenished = back
      .map((size) => ({ size, waiting: waits.find((w) => w.size === size)?.count ?? 0 }))
      .filter((r) => r.waiting > 0);
    if (replenished.length && input.status === "published") {
      await this.events.publish({
        type: "StockReplenished",
        occurredAt: new Date(),
        payload: { productId: before.id, slug, name: input.name, sizes: replenished },
      });
    }
    return { product: await this.get(slug), replenished };
  }

  async setStatus(slug: string, status: ProductStatus): Promise<AdminProduct> {
    const p = await this.mustFind(slug);
    if (status === "published" && !p.images.length) throw new ValidationError("Para publicar, subí al menos una foto");
    await this.repo.setStatus(slug, status);
    return this.get(slug);
  }

  /** Sube una foto de producto. TODO(fase 9): recorte 3:4 y AVIF/WebP en varios tamaños con sharp. */
  async uploadImage(file: { type: string; bytes: Uint8Array }): Promise<UploadResult> {
    const ext = EXT[file.type as keyof typeof EXT];
    if (!ext) throw new ValidationError("Formato no soportado: subí WebP, JPG, PNG o AVIF");
    if (file.bytes.byteLength > MAX_IMAGE_BYTES) throw new ValidationError("La foto pesa más de 8 MB");
    const path = await this.storage.save(`products/${randomUUID()}.${ext}`, file.bytes);
    return { path, url: this.storage.url(path) };
  }

  private async mustFind(slug: string): Promise<Product> {
    const p = await this.repo.findBySlug(slug);
    if (!p) throw new NotFoundError(`No existe la prenda "${slug}"`);
    return p;
  }

  private async checkCollection(slug: string) {
    if (!(await this.repo.collectionExists(slug))) throw new ValidationError("Esa colección no existe");
  }

  private present(p: Product, waits: PendingWaitlist[]): AdminProduct {
    return {
      ...toSummary(p, this.storage),
      care: p.care,
      images: p.images.map((i) => ({ path: i.path, url: this.storage.url(i.path), alt: i.alt })),
      waitlist: waits.filter((w) => w.productId === p.id).map(({ size, count }) => ({ size, count })),
      updatedAt: p.updatedAt.toISOString(),
    };
  }
}

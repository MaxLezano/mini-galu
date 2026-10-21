import { randomUUID } from "node:crypto";
import {
  ACCEPTED_IMAGE_TYPES,
  type AdminReview,
  MAX_IMAGE_BYTES,
  type ReviewableItem,
  type ReviewableOrder,
  type ReviewInputSchema,
  type ReviewModeration,
} from "@mini-galu/contracts";
import type { z } from "zod";
import { ConflictError, NotFoundError, ValidationError } from "../../shared/domain/errors";
import type { EventBus } from "../../shared/events/event-bus";
import type { ImageStorage } from "../../shared/media/image-storage";
import type { ImageResizer } from "../../shared/media/responsive-image-storage";
import { canReview, moderate, publicAuthor } from "../domain/review";
import type { ReviewOrder, ReviewPointsPort, ReviewRepository, ReviewRow, StoredReview } from "./ports";

type Photo = { type: string; bytes: Uint8Array };

/** Ancho del original que se guarda de la foto del cliente (las variantes salen de este). */
const PHOTO_WIDTH = 1440;

/** Reseñas: el cliente las deja desde su pedido entregado y Gaby decide cuáles se ven y cuáles van a la home. */
export class ReviewService {
  constructor(
    private readonly repo: ReviewRepository,
    private readonly storage: ImageStorage,
    private readonly resizer: ImageResizer,
    private readonly points: ReviewPointsPort = async () => null,
    private readonly events?: Pick<EventBus, "publish">,
  ) {}

  /** Las prendas del pedido con la reseña que ya dejó cada una (el token es el del pedido: link del mail o la cuenta). */
  async forOrder(number: string, token: string): Promise<ReviewableOrder> {
    const o = await this.owned(number, token);
    const done = await this.repo.ofItems(o.items.map((i) => i.id));
    return {
      number: o.number,
      firstName: o.firstName,
      author: publicAuthor(o.firstName, o.lastName),
      delivered: canReview(o.status),
      items: o.items.filter((i) => i.productId).map((i) => this.item(i, done)),
      points: await this.points(o.email),
    };
  }

  async submit(
    number: string,
    token: string,
    itemId: string,
    input: z.output<typeof ReviewInputSchema>,
    photo: Photo | null,
  ): Promise<ReviewableItem> {
    const o = await this.owned(number, token);
    if (!canReview(o.status)) throw new ValidationError("Vas a poder dejar tu reseña cuando te llegue el pedido");
    const it = o.items.find((i) => i.id === itemId);
    if (!it?.productId) throw new NotFoundError("Esa prenda no está en el pedido");
    if ((await this.repo.ofItems([it.id])).length) throw new ConflictError("Ya dejaste la reseña de esta prenda");
    const photoPath = photo ? await this.savePhoto(photo) : null;
    const added = await this.repo.add({
      productId: it.productId,
      orderItemId: it.id,
      author: publicAuthor(o.firstName, o.lastName),
      city: o.city,
      rating: input.rating,
      body: input.body,
      size: it.size,
      fit: input.fit,
      photoPath,
    });
    if (!added) throw new ConflictError("Ya dejaste la reseña de esta prenda");
    return this.item(it, await this.repo.ofItems([it.id]));
  }

  /* ---------------------------------------------------------------- panel */

  async list(): Promise<AdminReview[]> {
    return (await this.repo.list()).map((r) => this.admin(r));
  }

  async moderate(id: string, m: ReviewModeration): Promise<AdminReview> {
    const r = await this.repo.find(id);
    if (!r) throw new NotFoundError("No existe esa reseña");
    const next = moderate(r, m);
    const published = next.status === "publicada" && r.status !== "publicada";
    await this.repo.update(id, next);
    // publicarla le suma los puntos al cliente (una vez por reseña: lo cuida el módulo de puntos)
    if (published)
      await this.events?.publish({ type: "ReviewPublished", occurredAt: new Date(), payload: { reviewId: id } });
    return this.admin({ ...r, ...next });
  }

  /* ---------------------------------------------------------------- */

  /** El pedido existe y el token coincide (si no, 404: no se revela si el número existe). */
  private async owned(number: string, token: string): Promise<ReviewOrder> {
    const o = await this.repo.findOrder(number);
    if (!o || !token || o.accessToken !== token) throw new NotFoundError("No encontramos ese pedido");
    return o;
  }

  /** Se vuelve a codificar siempre: valida que sea una foto y le saca los metadatos (el GPS del celular). */
  private async savePhoto(p: Photo): Promise<string> {
    if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(p.type))
      throw new ValidationError("Subí la foto en JPG, PNG, WebP o AVIF");
    if (p.bytes.byteLength > MAX_IMAGE_BYTES) throw new ValidationError("La foto pesa más de 8 MB");
    let bytes: Uint8Array;
    try {
      bytes = await this.resizer.resize(p.bytes, PHOTO_WIDTH, "webp");
    } catch {
      throw new ValidationError("No pudimos abrir la foto: probá con otra");
    }
    return this.storage.save(`reviews/${randomUUID()}.webp`, bytes);
  }

  private item(i: ReviewOrder["items"][number], done: StoredReview[]): ReviewableItem {
    const r = done.find((d) => d.orderItemId === i.id);
    return {
      id: i.id,
      slug: i.slug,
      name: i.name,
      size: i.size,
      imageUrl: i.imagePath ? this.storage.url(i.imagePath) : "",
      review: r
        ? {
            rating: r.rating,
            body: r.body,
            photoUrl: r.photoPath ? this.storage.url(r.photoPath) : null,
            published: r.status === "publicada",
          }
        : null,
    };
  }

  private admin(r: ReviewRow): AdminReview {
    const { photoPath, product, createdAt, ...rest } = r;
    return {
      ...rest,
      photoUrl: photoPath ? this.storage.url(photoPath) : null,
      product: {
        slug: product.slug,
        name: product.name,
        imageUrl: product.imagePath ? this.storage.url(product.imagePath) : null,
      },
      createdAt: createdAt.toISOString(),
    };
  }
}

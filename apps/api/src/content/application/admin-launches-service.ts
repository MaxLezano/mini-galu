import type { AdminLaunch, LaunchInput } from "@mini-galu/contracts";
import { ConflictError, NotFoundError, ValidationError } from "../../shared/domain/errors";
import type { EventBus } from "../../shared/events/event-bus";
import type { ImageStorage } from "../../shared/media/image-storage";
import { firstDayWindow, isDueForPublish, launchState } from "../domain/launch";
import type { AdminLaunchRepository, LaunchMetrics, LaunchRecord, ProductPublisher } from "./launch-ports";

/** Lanzamientos desde el panel: crear, programar, editar y publicar las prendas a la hora indicada. */
export class AdminLaunchesService {
  constructor(
    private readonly repo: AdminLaunchRepository,
    private readonly publisher: ProductPublisher,
    private readonly storage: ImageStorage,
    private readonly events: EventBus,
    private readonly metrics: LaunchMetrics,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async list(): Promise<AdminLaunch[]> {
    const all = await Promise.all((await this.repo.findAll()).map((l) => this.present(l)));
    return all.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  }

  async get(id: string): Promise<AdminLaunch> {
    return this.present(await this.mustFind(id));
  }

  async create(input: LaunchInput): Promise<AdminLaunch> {
    await this.validate(input, null);
    return this.get(await this.repo.create(input));
  }

  async update(id: string, input: LaunchInput): Promise<AdminLaunch> {
    const current = await this.mustFind(id);
    await this.validate(input, current);
    await this.repo.update(id, input);
    return this.get(id);
  }

  async remove(id: string): Promise<void> {
    const l = await this.mustFind(id);
    if (l.status !== "draft") throw new ConflictError("Solo se pueden borrar los borradores");
    await this.repo.delete(id);
  }

  /** Lo llama el programador cada minuto: publica las prendas de los lanzamientos que llegaron a su hora. */
  async publishDue(): Promise<string[]> {
    const now = this.now();
    const due = (await this.repo.findAll()).filter((l) => isDueForPublish(l, now));
    for (const l of due) {
      const r = await this.publisher.publish(l.products.map((p) => p.slug));
      await this.repo.markPublished(l.id, now);
      await this.events.publish({
        type: "LaunchPublished",
        occurredAt: now,
        payload: { launchId: l.id, title: l.title, published: r.published, skipped: r.skipped },
      });
    }
    return due.map((l) => l.id);
  }

  private async validate(input: LaunchInput, current: LaunchRecord | null) {
    const missing = await this.repo.missingProducts(input.productSlugs);
    if (missing.length) throw new ValidationError(`No existen estas prendas: ${missing.join(", ")}`);
    if (input.collectionSlug && !(await this.repo.collectionExists(input.collectionSlug)))
      throw new ValidationError("Esa colección no existe");
    // programar para el pasado no tiene sentido (salvo que ya se haya publicado y se esté corrigiendo un texto)
    const startsAt = new Date(input.startsAt);
    if (input.status === "scheduled" && !current?.publishedAt && startsAt <= this.now())
      throw new ValidationError("La fecha y hora del lanzamiento tienen que ser a futuro");
  }

  private async mustFind(id: string) {
    const l = await this.repo.findById(id);
    if (!l) throw new NotFoundError("No existe ese lanzamiento");
    return l;
  }

  private async present(l: LaunchRecord): Promise<AdminLaunch> {
    const state = launchState(l.status, l.startsAt, l.publishedAt, this.now());
    const slugs = l.products.map((p) => p.slug);
    return {
      id: l.id,
      title: l.title,
      coverNote: l.coverNote,
      teaser: l.teaser,
      coverPath: l.coverPath,
      coverUrl: l.coverPath ? this.storage.url(l.coverPath) : null,
      startsAt: l.startsAt.toISOString(),
      collectionSlug: l.collectionSlug,
      products: l.products.map((p) => ({
        slug: p.slug,
        name: p.name,
        status: p.status,
        imageUrl: p.imagePath ? this.storage.url(p.imagePath) : null,
      })),
      showCountdown: l.showCountdown,
      notifyBefore: l.notifyBefore,
      autoPublish: l.autoPublish,
      socialText: l.socialText,
      state,
      publishedAt: l.publishedAt?.toISOString() ?? null,
      signups: l.signups,
      favorites: await this.metrics.favorites(slugs),
      visits: await this.metrics.visits(l.id),
      soldFirstDay: state === "past" ? await this.soldFirstDay(l, slugs) : null,
    };
  }

  private soldFirstDay(l: LaunchRecord, slugs: string[]) {
    const { from, to } = firstDayWindow(l.startsAt, l.publishedAt);
    return this.metrics.unitsSold(slugs, from, to);
  }
}

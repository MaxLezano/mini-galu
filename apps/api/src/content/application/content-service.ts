import {
  type AdminHome,
  HomeBlockSchema,
  type HomeContent,
  type HomeHeroInput,
  type Launch,
  type LaunchSignupRequest,
} from "@mini-galu/contracts";
import type { CatalogService } from "../../catalog/application/catalog-service";
import { NotFoundError, ValidationError } from "../../shared/domain/errors";
import type { ImageStorage } from "../../shared/media/image-storage";
import { DEFAULT_HOME } from "../domain/home";
import type { ContentRepository, LaunchRow } from "./ports";

export class ContentService {
  constructor(
    private readonly content: ContentRepository,
    private readonly catalog: CatalogService,
    private readonly storage: ImageStorage,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async home(): Promise<HomeContent> {
    const block = await this.block();
    const [facets, reviews, launchRow] = await Promise.all([
      this.catalog.facets(),
      this.catalog.featuredReviews(),
      this.content.findUpcomingLaunch(this.now()),
    ]);
    const url = (p: string) => this.storage.url(p);
    const { imagePath, ...hero } = block.hero;
    return {
      announcements: block.announcements,
      // sin foto elegida (portada de base) va vacía y la tienda no dibuja la imagen
      hero: { ...hero, imageUrl: imagePath ? url(imagePath) : "" },
      featuredCollections: block.featuredCollections.flatMap(({ slug, title }) =>
        facets.collections.filter((c) => c.slug === slug).map((c) => ({ ...c, title })),
      ),
      railSlugs: block.railSlugs,
      launch: launchRow ? await this.toLaunch(launchRow) : null,
      lookbook: block.lookbook.map(({ imagePath, ...l }) => ({ ...l, imageUrl: url(imagePath) })),
      taller: block.taller.map(({ imagePath, alt }) => ({ imageUrl: url(imagePath), alt })),
      reviews,
      instagram: {
        handle: block.instagram.handle,
        url: block.instagram.url,
        imageUrls: block.instagram.imagePaths.map(url),
      },
    };
  }

  /** Portada para el panel: lo editable + fotos para elegir. */
  async adminHome(): Promise<AdminHome> {
    const block = await this.block();
    const paths = [
      block.hero.imagePath,
      ...block.taller.map((t) => t.imagePath),
      ...block.lookbook.map((l) => l.imagePath),
      ...(await this.content.launchCoverPaths()),
    ];
    return {
      hero: block.hero,
      announcements: block.announcements,
      heroImageUrl: block.hero.imagePath ? this.storage.url(block.hero.imagePath) : "",
      taller: block.taller.map((t) => ({ ...t, imageUrl: this.storage.url(t.imagePath) })),
      imageOptions: [...new Set(paths.filter(Boolean))].map((path) => ({ path, url: this.storage.url(path) })),
    };
  }

  async saveHero(input: HomeHeroInput): Promise<AdminHome> {
    const block = await this.block();
    await this.content.saveHomeBlock({
      ...block,
      hero: input.hero,
      announcements: input.announcements,
      taller: input.taller ?? block.taller,
    });
    return this.adminHome();
  }

  /** La guardada o, si todavía no hay (producción recién estrenada), la de base. */
  private async block() {
    return HomeBlockSchema.parse((await this.content.getHomeBlock()) ?? DEFAULT_HOME);
  }

  async joinLaunch(launchId: string, req: LaunchSignupRequest): Promise<{ created: boolean; signups: number }> {
    const launch = await this.content.findLaunch(launchId);
    if (!launch) throw new NotFoundError("No existe ese lanzamiento");
    if (launch.startsAt <= this.now())
      throw new ValidationError("Este lanzamiento ya salió: ¡las prendas están en la tienda!");
    const created = await this.content.addLaunchSignup(launchId, req.channel, req.contact);
    return { created, signups: await this.content.countLaunchSignups(launchId) };
  }

  private async toLaunch(l: LaunchRow): Promise<Launch> {
    return {
      id: l.id,
      title: l.title,
      collectionSlug: l.collectionSlug,
      startsAt: l.startsAt.toISOString(),
      teaser: l.teaser,
      coverUrl: l.coverPath ? this.storage.url(l.coverPath) : null,
      coverNote: l.coverNote,
      showCountdown: l.showCountdown,
      signups: await this.content.countLaunchSignups(l.id),
    };
  }
}

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
      hero: { ...hero, imageUrl: url(imagePath) },
      featuredCollections: block.featuredCollections.flatMap(({ slug, title }) =>
        facets.collections.filter((c) => c.slug === slug).map((c) => ({ ...c, title })),
      ),
      railSlugs: block.railSlugs,
      launch: launchRow ? await this.toLaunch(launchRow) : null,
      lookbook: block.lookbook.map(({ imagePath, ...l }) => ({ ...l, imageUrl: url(imagePath) })),
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
      ...block.lookbook.map((l) => l.imagePath),
      ...(await this.content.launchCoverPaths()),
    ];
    return {
      hero: block.hero,
      announcements: block.announcements,
      heroImageUrl: this.storage.url(block.hero.imagePath),
      imageOptions: [...new Set(paths)].map((path) => ({ path, url: this.storage.url(path) })),
    };
  }

  async saveHero(input: HomeHeroInput): Promise<AdminHome> {
    const block = await this.block();
    await this.content.saveHomeBlock({ ...block, hero: input.hero, announcements: input.announcements });
    return this.adminHome();
  }

  private async block() {
    const raw = await this.content.getHomeBlock();
    if (!raw) throw new NotFoundError("La portada todavía no está cargada (corré pnpm db:seed)");
    return HomeBlockSchema.parse(raw);
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

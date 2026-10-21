import type { HomeBlock } from "@mini-galu/contracts";
import { describe, expect, it } from "vitest";
import type { CatalogService } from "../../catalog/application/catalog-service";
import type { ImageStorage } from "../../shared/media/image-storage";
import { DEFAULT_HOME } from "../domain/home";
import { ContentService } from "./content-service";
import type { ContentRepository } from "./ports";

class MemoryContent implements ContentRepository {
  home: HomeBlock | null = null;
  async getHomeBlock() {
    return this.home;
  }
  async saveHomeBlock(block: HomeBlock) {
    this.home = block;
  }
  async launchCoverPaths() {
    return [];
  }
  async findUpcomingLaunch() {
    return null;
  }
  async findLaunch() {
    return null;
  }
  async countLaunchSignups() {
    return 0;
  }
  async addLaunchSignup() {
    return true;
  }
}

const catalog = {
  facets: async () => ({
    collections: [],
    sizes: [],
    colors: [],
    occasions: [],
    priceRange: { minCents: 0, maxCents: 0 },
  }),
  featuredReviews: async () => ({ rating: 0, count: 0, featured: [] }),
} as unknown as CatalogService;
const storage: ImageStorage = { url: (p) => `https://fotos.minigalu.com.ar/${p}`, save: async (p) => p };

describe("ContentService · portada", () => {
  it("sin portada guardada (producción recién estrenada) rige la de base, sin fotos ni secciones vacías", async () => {
    const service = new ContentService(new MemoryContent(), catalog, storage);
    const home = await service.home();
    expect(home.hero.titleLines).toEqual(DEFAULT_HOME.hero.titleLines);
    expect(home.hero.imageUrl).toBe("");
    expect(home.announcements.length).toBeGreaterThan(0);
    expect(home.featuredCollections).toEqual([]);
    expect(home.lookbook).toEqual([]);
    expect(home.instagram.imageUrls).toEqual([]);

    const admin = await service.adminHome();
    expect(admin.heroImageUrl).toBe("");
    expect(admin.imageOptions).toEqual([]);
  });

  it("guardar la portada desde el panel funciona aunque no hubiera ninguna", async () => {
    const repo = new MemoryContent();
    const service = new ContentService(repo, catalog, storage);
    await service.saveHero({
      hero: { ...DEFAULT_HOME.hero, eyebrow: "Verano 27", imagePath: "content/portada.webp", imageAlt: "Portada" },
      announcements: ["Envío gratis desde $90.000"],
    });
    expect(repo.home?.hero.eyebrow).toBe("Verano 27");
    expect((await service.home()).hero.imageUrl).toBe("https://fotos.minigalu.com.ar/content/portada.webp");
    expect((await service.adminHome()).imageOptions).toEqual([
      { path: "content/portada.webp", url: "https://fotos.minigalu.com.ar/content/portada.webp" },
    ]);
  });
});

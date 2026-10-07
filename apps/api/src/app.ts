import { relative } from "node:path";
import { serveStatic } from "@hono/node-server/serve-static";
import { createDb } from "@mini-galu/db";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { createAuth } from "./auth/infrastructure/better-auth";
import { authRoutes, requireAdmin } from "./auth/infrastructure/http/auth-routes";
import { AdminCatalogService } from "./catalog/application/admin-catalog-service";
import { CatalogService } from "./catalog/application/catalog-service";
import { DrizzleAdminProductRepository } from "./catalog/infrastructure/drizzle-admin-product-repository";
import {
  DrizzleProductRepository,
  DrizzleWaitlistRepository,
} from "./catalog/infrastructure/drizzle-product-repository";
import { adminCatalogRoutes } from "./catalog/infrastructure/http/admin-catalog-routes";
import { catalogRoutes } from "./catalog/infrastructure/http/catalog-routes";
import type { Config } from "./config";
import { AdminLaunchesService } from "./content/application/admin-launches-service";
import { ContentService } from "./content/application/content-service";
import type { ProductPublisher } from "./content/application/launch-ports";
import { DrizzleAdminLaunchRepository } from "./content/infrastructure/drizzle-admin-launch-repository";
import { DrizzleContentRepository } from "./content/infrastructure/drizzle-content-repository";
import { adminHomeRoutes } from "./content/infrastructure/http/admin-home-routes";
import { adminLaunchesRoutes } from "./content/infrastructure/http/admin-launches-routes";
import { contentRoutes } from "./content/infrastructure/http/content-routes";
import { EventBus } from "./shared/events/event-bus";
import { onError } from "./shared/http/errors";
import { LocalDiskImageStorage } from "./shared/media/image-storage";
import { IntervalScheduler } from "./shared/scheduler/interval-scheduler";

/** Composition root: acá (y solo acá) se eligen los adapters de cada puerto. */
export function buildApp(config: Config) {
  const db = createDb(config.databaseUrl);
  const storage = new LocalDiskImageStorage(config.publicUrl, config.mediaDir);
  const events = new EventBus();
  const auth = createAuth(db, {
    publicUrl: config.publicUrl,
    webOrigin: config.webOrigin,
    secret: config.authSecret,
    secureCookies: config.env === "production",
  });

  const catalog = new CatalogService(new DrizzleProductRepository(db), new DrizzleWaitlistRepository(db), storage);
  const adminCatalog = new AdminCatalogService(new DrizzleAdminProductRepository(db), storage, events);
  const content = new ContentService(new DrizzleContentRepository(db), catalog, storage);

  // los lanzamientos publican prendas a través del catálogo (que valida, por ejemplo, que tengan foto)
  const publisher: ProductPublisher = {
    async publish(slugs) {
      const published: string[] = [];
      const skipped: { slug: string; reason: string }[] = [];
      for (const slug of slugs) {
        try {
          await adminCatalog.setStatus(slug, "published");
          published.push(slug);
        } catch (e) {
          skipped.push({ slug, reason: e instanceof Error ? e.message : "error" });
        }
      }
      return { published, skipped };
    },
  };
  const launches = new AdminLaunchesService(new DrizzleAdminLaunchRepository(db), publisher, storage, events);
  const scheduler = new IntervalScheduler();
  if (config.env !== "test") scheduler.every(60, "publicar lanzamientos", () => launches.publishDue());

  // TODO(fase 6 · automations): "Volvió un talle" avisa a la lista de espera por WhatsApp/mail
  events.on("StockReplenished", (e) => console.info("[eventos] Volvió un talle:", JSON.stringify(e.payload)));
  // TODO(fase 6 · automations): avisar a los anotados que ya salió (y 1 hora antes si notifyBefore)
  events.on("LaunchPublished", (e) => console.info("[eventos] Lanzamiento publicado:", JSON.stringify(e.payload)));

  const app = new Hono()
    .use(logger())
    .use("*", cors({ origin: config.webOrigin, credentials: true }))
    .use(
      "/media/*",
      serveStatic({
        root: relative(process.cwd(), config.mediaDir),
        rewriteRequestPath: (p) => p.replace(/^\/media/, ""),
        onFound: (_path, c) => c.header("Cache-Control", "public, max-age=86400"),
      }),
    )
    .get("/health", (c) => c.json({ ok: true }))
    .route("/catalog", catalogRoutes(catalog))
    .route("/content", contentRoutes(content))
    .route("/auth", authRoutes(auth))
    .use("/admin/*", requireAdmin(auth))
    .route("/admin/catalog", adminCatalogRoutes(adminCatalog, catalog))
    .route("/admin/content/launches", adminLaunchesRoutes(launches))
    .route("/admin/content/home", adminHomeRoutes(content))
    .onError(onError)
    .notFound((c) => c.json({ error: { code: "not_found", message: "Ruta inexistente" } }, 404));

  return { app, db, events, scheduler };
}

export type AppType = ReturnType<typeof buildApp>["app"];

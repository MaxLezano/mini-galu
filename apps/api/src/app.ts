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
import { ContentService } from "./content/application/content-service";
import { DrizzleContentRepository } from "./content/infrastructure/drizzle-content-repository";
import { contentRoutes } from "./content/infrastructure/http/content-routes";
import { EventBus } from "./shared/events/event-bus";
import { onError } from "./shared/http/errors";
import { LocalDiskImageStorage } from "./shared/media/image-storage";

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

  // TODO(fase 6 · automations): "Volvió un talle" avisa a la lista de espera por WhatsApp/mail
  events.on("StockReplenished", (e) => console.info("[eventos] Volvió un talle:", JSON.stringify(e.payload)));

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
    .onError(onError)
    .notFound((c) => c.json({ error: { code: "not_found", message: "Ruta inexistente" } }, 404));

  return { app, db, events };
}

export type AppType = ReturnType<typeof buildApp>["app"];

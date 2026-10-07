import { HomeHeroInputSchema } from "@mini-galu/contracts";
import { Hono } from "hono";
import type { AdminVars } from "../../../auth/infrastructure/http/auth-routes";
import { parse } from "../../../shared/http/errors";
import type { ContentService } from "../../application/content-service";

/** /admin/content/home — portada editable (protegido con requireAdmin en app.ts). */
export function adminHomeRoutes(content: ContentService) {
  return new Hono<AdminVars>()
    .get("/", async (c) => c.json(await content.adminHome()))
    .put("/", async (c) => c.json(await content.saveHero(parse(HomeHeroInputSchema, await c.req.json()))));
}

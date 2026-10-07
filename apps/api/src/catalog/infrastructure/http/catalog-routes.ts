import { CatalogQuerySchema, WaitlistRequestSchema } from "@mini-galu/contracts";
import { Hono } from "hono";
import { parse } from "../../../shared/http/errors";
import type { CatalogService } from "../../application/catalog-service";

export function catalogRoutes(catalog: CatalogService) {
  return new Hono()
    .get("/products", async (c) => c.json(await catalog.list(parse(CatalogQuerySchema, flatQuery(c.req.queries())))))
    .get("/products/:slug", async (c) => c.json(await catalog.detail(c.req.param("slug"))))
    .get("/facets", async (c) => c.json(await catalog.facets()))
    .post("/waitlist", async (c) => {
      const r = await catalog.joinWaitlist(parse(WaitlistRequestSchema, await c.req.json()));
      return c.json(r, r.created ? 201 : 200);
    });
}

/** ?talle=6&talle=8 y ?talle=6,8 → ["6","8"]; los demás parámetros quedan como string. */
function flatQuery(q: Record<string, string[]>) {
  return Object.fromEntries(Object.entries(q).map(([k, v]) => [k, v.length > 1 ? v : v[0]]));
}

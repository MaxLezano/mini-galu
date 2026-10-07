import { ProductInputSchema, StatusInputSchema } from "@mini-galu/contracts";
import { Hono } from "hono";
import type { AdminVars } from "../../../auth/infrastructure/http/auth-routes";
import { ValidationError } from "../../../shared/domain/errors";
import { parse } from "../../../shared/http/errors";
import type { AdminCatalogService } from "../../application/admin-catalog-service";
import type { CatalogService } from "../../application/catalog-service";

/** /admin/catalog/* — protegido con requireAdmin en app.ts. */
export function adminCatalogRoutes(admin: AdminCatalogService, catalog: CatalogService) {
  return new Hono<AdminVars>()
    .get("/products", async (c) => c.json(await admin.list()))
    .post("/products", async (c) => c.json(await admin.create(parse(ProductInputSchema, await c.req.json())), 201))
    .get("/products/:slug", async (c) => c.json(await admin.get(c.req.param("slug"))))
    .put("/products/:slug", async (c) =>
      c.json(await admin.update(c.req.param("slug"), parse(ProductInputSchema, await c.req.json()))),
    )
    .patch("/products/:slug/status", async (c) =>
      c.json(await admin.setStatus(c.req.param("slug"), parse(StatusInputSchema, await c.req.json()).status)),
    )
    .get("/collections", async (c) => c.json((await catalog.facets()).collections))
    .post("/images", async (c) => {
      const body = await c.req.parseBody();
      const file = body.file;
      if (!(file instanceof File)) throw new ValidationError("Falta la foto (campo file)");
      return c.json(await admin.uploadImage({ type: file.type, bytes: new Uint8Array(await file.arrayBuffer()) }), 201);
    });
}

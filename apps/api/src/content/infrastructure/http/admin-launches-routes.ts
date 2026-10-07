import { LaunchInputSchema } from "@mini-galu/contracts";
import { Hono } from "hono";
import type { AdminVars } from "../../../auth/infrastructure/http/auth-routes";
import { parse } from "../../../shared/http/errors";
import type { AdminLaunchesService } from "../../application/admin-launches-service";

/** /admin/content/launches/* — protegido con requireAdmin en app.ts. */
export function adminLaunchesRoutes(launches: AdminLaunchesService) {
  return new Hono<AdminVars>()
    .get("/", async (c) => c.json(await launches.list()))
    .post("/", async (c) => c.json(await launches.create(parse(LaunchInputSchema, await c.req.json())), 201))
    .get("/:id", async (c) => c.json(await launches.get(c.req.param("id"))))
    .put("/:id", async (c) =>
      c.json(await launches.update(c.req.param("id"), parse(LaunchInputSchema, await c.req.json()))),
    )
    .delete("/:id", async (c) => {
      await launches.remove(c.req.param("id"));
      return c.body(null, 204);
    });
}

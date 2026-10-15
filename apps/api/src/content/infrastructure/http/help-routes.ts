import { HelpPageInputSchema, HelpTopicSchema } from "@mini-galu/contracts";
import { Hono } from "hono";
import type { AdminVars } from "../../../auth/infrastructure/http/auth-routes";
import { NotFoundError } from "../../../shared/domain/errors";
import { parse } from "../../../shared/http/errors";
import type { HelpService } from "../../application/help-service";

function topic(raw: string) {
  const r = HelpTopicSchema.safeParse(raw);
  if (!r.success) throw new NotFoundError("No existe esa página de ayuda");
  return r.data;
}

/** /content/help — páginas de ayuda de la tienda. */
export function helpRoutes(help: HelpService) {
  return new Hono()
    .get("/", async (c) => c.json(await help.links()))
    .get("/:topic", async (c) => c.json(await help.publicPage(topic(c.req.param("topic")))));
}

/** /admin/content/help — editar las páginas de ayuda (protegido con requireAdmin en app.ts). */
export function adminHelpRoutes(help: HelpService) {
  return new Hono<AdminVars>()
    .get("/", async (c) => c.json(await help.all()))
    .put("/:topic", async (c) =>
      c.json(await help.save(topic(c.req.param("topic")), parse(HelpPageInputSchema, await c.req.json()))),
    )
    .delete("/:topic", async (c) => c.json(await help.reset(topic(c.req.param("topic")))));
}

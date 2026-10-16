import { AssistantFactInputSchema, AssistantSettingsSchema } from "@mini-galu/contracts";
import { Hono } from "hono";
import { parse } from "../../../shared/http/errors";
import type { AssistantAdminService } from "../../application/assistant-admin-service";

/** /admin/assistant — conversaciones, "enseñale" y ajustes (admin-galu.html). Requiere sesión del taller. */
export function adminAssistantRoutes(admin: AssistantAdminService) {
  return new Hono()
    .get("/", async (c) => c.json(await admin.admin()))
    .get("/overview", async (c) => c.json(await admin.overview()))
    .put("/settings", async (c) =>
      c.json(await admin.updateSettings(parse(AssistantSettingsSchema, await c.req.json()))),
    )
    .post("/facts", async (c) => c.json(await admin.teach(parse(AssistantFactInputSchema, await c.req.json()))))
    .delete("/facts/:id", async (c) => c.json(await admin.forget(c.req.param("id"))));
}

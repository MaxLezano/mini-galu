import {
  type AdminAutomations,
  AUTOMATION_KEYS,
  type AutomationKey,
  AutomationTestSchema,
  RuleUpdateSchema,
} from "@mini-galu/contracts";
import { Hono } from "hono";
import { NotFoundError } from "../../../shared/domain/errors";
import { parse } from "../../../shared/http/errors";
import type { AutomationService } from "../../application/automation-service";

/** /admin/automations — reglas, registro y prueba (admin-automatizaciones.html). Requiere sesión del taller. */
export function adminAutomationRoutes(automations: AutomationService, channels: () => AdminAutomations["channels"]) {
  const key = (k: string): AutomationKey => {
    if (!(AUTOMATION_KEYS as string[]).includes(k)) throw new NotFoundError("No existe esa regla");
    return k as AutomationKey;
  };
  return new Hono()
    .get("/", async (c) => c.json(await automations.admin(channels())))
    .patch("/:key", async (c) => {
      await automations.update(key(c.req.param("key")), parse(RuleUpdateSchema, await c.req.json()));
      return c.json(await automations.admin(channels()));
    })
    .post("/test", async (c) => {
      const { email, whatsapp } = parse(AutomationTestSchema, await c.req.json());
      return c.json({ sent: await automations.test(email, whatsapp) });
    });
}

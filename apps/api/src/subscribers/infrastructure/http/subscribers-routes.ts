import { Hono } from "hono";
import type { SubscribersService } from "../../application/subscribers-service";

/** /admin/subscribers — cartas, anotados a lanzamientos y avisos de talle (solo lectura). Requiere sesión del taller. */
export function adminSubscribersRoutes(subscribers: SubscribersService) {
  return new Hono().get("/", async (c) => c.json(await subscribers.list()));
}

import { StorePoliciesSchema } from "@mini-galu/contracts";
import { Hono } from "hono";
import type { AdminVars } from "../../../auth/infrastructure/http/auth-routes";
import { parse } from "../../../shared/http/errors";
import type { PoliciesService } from "../../application/policies-service";

/** /policies — lo que la tienda muestra (días de cambio, envío gratis, formas de entrega, tarifas). */
export function policiesRoutes(policies: PoliciesService) {
  return new Hono().get("/", async (c) => c.json(await policies.get()));
}

/** /admin/policies — editarlas desde "Tienda y pagos" (protegido con requireAdmin en app.ts). */
export function adminPoliciesRoutes(policies: PoliciesService) {
  return new Hono<AdminVars>().put("/", async (c) =>
    c.json(await policies.save(parse(StorePoliciesSchema, await c.req.json()))),
  );
}

import { AddressInputSchema, ChildInputSchema, FavoritesMergeSchema, ProfileUpdateSchema } from "@mini-galu/contracts";
import { Hono } from "hono";
import { createMiddleware } from "hono/factory";
import { z } from "zod";
import type { Auth } from "../../../auth/infrastructure/better-auth";
import { parse } from "../../../shared/http/errors";
import type { CustomerService } from "../../application/customer-service";

type Vars = { Variables: { userId: string } };

/** Cualquier cuenta con sesión (clientes y el taller). */
function requireAccount(auth: Auth) {
  return createMiddleware<Vars>(async (c, next) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json({ error: { code: "unauthorized", message: "Ingresá a tu cuenta" } }, 401);
    c.set("userId", session.user.id);
    await next();
  });
}

const FavoriteSchema = z.object({ on: z.boolean() });

/** /me — "Mi cuenta" (cuenta.html). */
export function accountRoutes(auth: Auth, customers: CustomerService) {
  return new Hono<Vars>()
    .use("*", requireAccount(auth))
    .get("/", async (c) => c.json(await customers.overview(c.get("userId"))))
    .put("/profile", async (c) =>
      c.json(await customers.updateProfile(c.get("userId"), parse(ProfileUpdateSchema, await c.req.json()))),
    )
    .post("/children", async (c) =>
      c.json(await customers.addChild(c.get("userId"), parse(ChildInputSchema, await c.req.json())), 201),
    )
    .put("/children/:id", async (c) =>
      c.json(
        await customers.updateChild(c.get("userId"), c.req.param("id"), parse(ChildInputSchema, await c.req.json())),
      ),
    )
    .delete("/children/:id", async (c) => {
      await customers.deleteChild(c.get("userId"), c.req.param("id"));
      return c.body(null, 204);
    })
    .post("/addresses", async (c) =>
      c.json(await customers.addAddress(c.get("userId"), parse(AddressInputSchema, await c.req.json())), 201),
    )
    .put("/addresses/:id", async (c) =>
      c.json(
        await customers.updateAddress(
          c.get("userId"),
          c.req.param("id"),
          parse(AddressInputSchema, await c.req.json()),
        ),
      ),
    )
    .delete("/addresses/:id", async (c) => {
      await customers.deleteAddress(c.get("userId"), c.req.param("id"));
      return c.body(null, 204);
    })
    .put("/favorites/:slug", async (c) =>
      c.json(
        await customers.setFavorite(c.get("userId"), c.req.param("slug"), parse(FavoriteSchema, await c.req.json()).on),
      ),
    )
    .post("/favorites/merge", async (c) =>
      c.json(await customers.mergeFavorites(c.get("userId"), parse(FavoritesMergeSchema, await c.req.json()).slugs)),
    );
}

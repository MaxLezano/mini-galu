import { LaunchSignupRequestSchema } from "@mini-galu/contracts";
import { Hono } from "hono";
import { parse } from "../../../shared/http/errors";
import type { ContentService } from "../../application/content-service";

export function contentRoutes(content: ContentService) {
  return new Hono()
    .get("/home", async (c) => c.json(await content.home()))
    .post("/launches/:id/signups", async (c) => {
      const r = await content.joinLaunch(c.req.param("id"), parse(LaunchSignupRequestSchema, await c.req.json()));
      return c.json(r, r.created ? 201 : 200);
    });
}

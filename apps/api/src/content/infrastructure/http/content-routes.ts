import { LaunchSignupRequestSchema, LaunchVisitRequestSchema } from "@mini-galu/contracts";
import { Hono } from "hono";
import { parse } from "../../../shared/http/errors";
import { clientIp } from "../../../shared/http/rate-limit";
import type { ContentService } from "../../application/content-service";
import type { LaunchVisitsService } from "../../application/launch-visits-service";
import { isBot } from "../../domain/launch";

/** `isStaff`: la cuenta del taller mirando su propio adelanto no suma visitas. */
export function contentRoutes(
  content: ContentService,
  visits: LaunchVisitsService,
  isStaff: (headers: Headers) => Promise<boolean>,
) {
  return new Hono()
    .get("/home", async (c) => c.json(await content.home()))
    .post("/launches/:id/signups", async (c) => {
      const r = await content.joinLaunch(c.req.param("id"), parse(LaunchSignupRequestSchema, await c.req.json()));
      return c.json(r, r.created ? 201 : 200);
    })
    .post("/launches/visits", async (c) => {
      const target = parse(LaunchVisitRequestSchema, await c.req.json());
      const ua = c.req.header("user-agent");
      if (!isBot(ua) && !(await isStaff(c.req.raw.headers))) await visits.record(target, `${clientIp(c)}|${ua}`);
      return c.body(null, 204);
    });
}

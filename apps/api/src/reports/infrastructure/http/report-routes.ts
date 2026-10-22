import { ReportMonthSchema } from "@mini-galu/contracts";
import { Hono } from "hono";
import { z } from "zod";
import { parse } from "../../../shared/http/errors";
import type { ReportService } from "../../application/report-service";

const Query = z.object({ mes: ReportMonthSchema.optional() });

/** /admin/reports — reporte mensual (?mes=AAAA-MM; sin mes, el último cerrado). Requiere sesión del taller. */
export function adminReportRoutes(reports: ReportService) {
  return new Hono().get("/monthly", async (c) => c.json(await reports.monthly(parse(Query, c.req.query()).mes)));
}

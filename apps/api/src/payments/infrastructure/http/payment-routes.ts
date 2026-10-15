import { CardPaymentInputSchema, PaymentSettingsSchema, RefundInputSchema } from "@mini-galu/contracts";
import { Hono } from "hono";
import { z } from "zod";
import { parse } from "../../../shared/http/errors";
import type { PaymentService } from "../../application/payment-service";
import type { RefundService } from "../../application/refund-service";

const Token = z.object({ t: z.string().min(1) });

/** /checkout — cobrar un pedido (tarjeta, dinero en cuenta) y confirmar la vuelta de Mercado Pago. */
export function checkoutPaymentRoutes(payments: PaymentService) {
  return new Hono()
    .get("/config", async (c) => c.json(await payments.config()))
    .get("/installments", async (c) => {
      const { amounts } = parse(
        z.object({
          amounts: z
            .string()
            .transform((s) => s.split(",").map(Number))
            .pipe(z.array(z.number().int().positive()).min(1).max(60)),
        }),
        c.req.query(),
      );
      return c.json(await payments.installments(amounts));
    })
    .get("/orders/:number/installments", async (c) => {
      const { t, bin } = parse(Token.extend({ bin: z.string().regex(/^\d{6,8}$/) }), c.req.query());
      return c.json(await payments.cardPlans(c.req.param("number"), t, bin));
    })
    .post("/orders/:number/pay", async (c) => {
      const body = await c.req.json();
      const { t } = parse(Token, body);
      return c.json(await payments.payCard(c.req.param("number"), t, parse(CardPaymentInputSchema, body.card)));
    })
    .post("/orders/:number/wallet", async (c) => {
      const { t, preferenceId } = parse(
        Token.extend({ preferenceId: z.string().max(80).nullable().default(null) }),
        await c.req.json(),
      );
      return c.json(await payments.wallet(c.req.param("number"), t, preferenceId));
    })
    .post("/orders/:number/sync", async (c) => {
      const { t, paymentId } = parse(Token.extend({ paymentId: z.string().min(1).max(40) }), await c.req.json());
      await payments.syncReturn(c.req.param("number"), t, paymentId);
      return c.body(null, 204);
    });
}

/**
 * /payments/webhook — avisos de Mercado Pago. Responde 200 rápido (si no, Mercado Pago reintenta);
 * con firma inválida, 401.
 */
export function webhookRoutes(payments: PaymentService) {
  return new Hono().post("/webhook", async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as { type?: string; data?: { id?: string | number } };
    const dataId = c.req.query("data.id") ?? (body.data?.id !== undefined ? String(body.data.id) : null);
    await payments.webhook({
      type: c.req.query("type") ?? body.type ?? null,
      dataId,
      requestId: c.req.header("x-request-id") ?? "",
      signature: c.req.header("x-signature") ?? "",
    });
    return c.json({ ok: true });
  });
}

/** /admin/payments — ajustes de Mercado Pago del panel. */
export function adminPaymentRoutes(payments: PaymentService) {
  return new Hono()
    .get("/", async (c) => c.json(await payments.admin()))
    .put("/", async (c) => c.json(await payments.saveSettings(parse(PaymentSettingsSchema, await c.req.json()))));
}

/** /admin/orders/:number/refund — reintegrar un pedido desde su detalle. Requiere sesión del taller. */
export function adminRefundRoutes(refunds: RefundService) {
  return new Hono().post("/:number/refund", async (c) =>
    c.json(await refunds.refund(c.req.param("number"), parse(RefundInputSchema, await c.req.json().catch(() => ({}))))),
  );
}

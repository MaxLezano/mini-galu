import { CardPaymentInputSchema } from "@mini-galu/contracts";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MercadoPagoGateway } from "./mercadopago-gateway";

const mp = new MercadoPagoGateway({
  accessToken: "APP_USR-x",
  publicKey: "APP_USR-y",
  webhookSecret: null,
  mode: "prueba",
  notificationUrl: null,
});

const card = CardPaymentInputSchema.parse({
  method: "credito",
  token: "tok",
  paymentMethodId: "master",
  installments: 3,
  payer: { email: "test_user_1@testuser.com" },
});

/** Respuestas con la forma que devolvió el sandbox (titulares APRO y OTHE). */
const order = (status: string, detail: string) => ({
  id: "ORDTST01",
  status: status === "failed" ? "failed" : status,
  status_detail: status === "failed" ? "failed" : detail,
  total_amount: "43900.00",
  total_paid_amount: "43900.00",
  external_reference: "pedido-1",
  transactions: {
    payments: [
      {
        id: "PAY01",
        amount: "43900.00",
        status,
        status_detail: detail,
        payment_method: { id: "master", type: "credit_card", installments: 3 },
      },
    ],
  },
});

const respond = (status: number, body: unknown) =>
  vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(body), { status }));

afterEach(() => vi.restoreAllMocks());

describe("MercadoPagoGateway (API de Orders)", () => {
  it("cobra con una orden online en pesos con dos decimales", async () => {
    const f = respond(201, order("processed", "accredited"));
    const p = await mp.payWithCard({
      orderId: "pedido-1",
      idempotencyKey: "k",
      amountCents: 43_900_00,
      description: "",
      card,
    });
    const [url, init] = f.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.mercadopago.com/v1/orders");
    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({
      type: "online",
      processing_mode: "automatic",
      total_amount: "43900.00",
      external_reference: "pedido-1",
      transactions: { payments: [{ amount: "43900.00", payment_method: { type: "credit_card", installments: 3 } }] },
    });
    expect(p).toMatchObject({
      id: "ORDTST01",
      status: "processed",
      method: "credito",
      installments: 3,
      amountCents: 43_900_00,
    });
  });

  it("un rechazo (402) devuelve la orden con el motivo del pago, sin tirar error", async () => {
    respond(402, order("failed", "rejected_by_issuer"));
    const p = await mp.payWithCard({
      orderId: "pedido-1",
      idempotencyKey: "k",
      amountCents: 43_900_00,
      description: "",
      card,
    });
    expect(p).toMatchObject({ status: "failed", statusDetail: "rejected_by_issuer", orderId: "pedido-1" });
  });

  it("consulta órdenes (ORD…) y pagos de dinero en cuenta (numéricos) en su API", async () => {
    const f = respond(200, order("processed", "accredited"));
    await mp.fetch("ORDTST01");
    expect(f.mock.calls[0]?.[0]).toBe("https://api.mercadopago.com/v1/orders/ORDTST01");
    f.mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 123,
          status: "approved",
          status_detail: "accredited",
          payment_type_id: "account_money",
          installments: 1,
          transaction_amount: 439,
          external_reference: "pedido-1",
        }),
      ),
    );
    expect(await mp.fetch("123")).toMatchObject({ method: "dinero_cuenta", amountCents: 439_00 });
    expect(f.mock.calls[1]?.[0]).toBe("https://api.mercadopago.com/v1/payments/123");
  });
});

describe("MercadoPagoGateway.installments", () => {
  const plan = (free: number[], all: number[]) => ({
    payer_costs: all.map((n) => ({ installments: n, installment_rate: free.includes(n) ? 0 : 20 })),
  });

  it("solo cuenta como sin interés lo que dan todos los bancos de Visa y Mastercard", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) =>
      String(url).includes("payment_method_id=visa")
        ? new Response(JSON.stringify([plan([1, 3, 6], [1, 3, 6, 12]), plan([1, 3], [1, 3, 6, 12])]))
        : new Response(JSON.stringify([plan([1, 3, 6], [1, 3, 6, 9, 12, 24])])),
    );
    expect(await mp.installments(90_000_00)).toEqual({ interestFree: 3, max: 24 });
  });

  it("sin promociones o sin respuesta no promete nada", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify([plan([1], [1, 6, 12])])));
    expect(await mp.installments(90_000_00)).toEqual({ interestFree: 1, max: 12 });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 500 }));
    expect(await mp.installments(90_000_00)).toEqual({ interestFree: 1, max: 1 });
  });
});

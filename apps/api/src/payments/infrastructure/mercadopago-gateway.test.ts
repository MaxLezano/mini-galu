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

describe("MercadoPagoGateway.netReceived", () => {
  /** Pago de la API de Payments como lo devolvió el sandbox para una orden de $10.000 con tarjeta. */
  const payment = (id: number, status: string, order: string | null, net = 9590) => ({
    id,
    status,
    status_detail: "accredited",
    payment_type_id: "credit_card",
    installments: 1,
    transaction_amount: 10000,
    external_reference: "pedido-1",
    transaction_details: { net_received_amount: net },
    point_of_interaction: { references: order ? [{ id: order, type: "ORDER_MP" }] : [] },
  });

  it("de una orden busca su pago aprobado en la API de Payments (la de Orders no informa el neto)", async () => {
    const f = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify(order("processed", "accredited"))))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            results: [
              payment(1, "rejected", "ORDTST01", 0),
              payment(2, "approved", "ORDOTRA", 1),
              payment(3, "approved", "ORDTST01"),
            ],
          }),
        ),
      );
    expect(await mp.netReceived("ORDTST01")).toBe(9_590_00);
    expect(f.mock.calls[1]?.[0]).toBe("https://api.mercadopago.com/v1/payments/search?external_reference=pedido-1");
  });

  it("si no encuentra el pago aprobado de la orden, no lo adivina", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify(order("processed", "accredited"))))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ results: [payment(2, "approved", "ORDA"), payment(3, "approved", "ORDB")] })),
      );
    expect(await mp.netReceived("ORDTST01")).toBeNull();
  });

  it("dinero en cuenta: el neto viene en el pago", async () => {
    const f = respond(200, payment(123, "approved", null, 425.5));
    expect(await mp.netReceived("123")).toBe(425_50);
    expect(f.mock.calls[0]?.[0]).toBe("https://api.mercadopago.com/v1/payments/123");
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

describe("MercadoPagoGateway.cardPlans", () => {
  it("convierte el plan de la tarjeta (respuesta real del sandbox por BIN 50317557)", async () => {
    const f = respond(200, [
      {
        payment_type_id: "credit_card",
        issuer: { name: "Mastercard" },
        payer_costs: [
          {
            installments: 1,
            installment_rate: 0,
            installment_amount: 47000,
            total_amount: 47000,
            labels: ["CFT_0,00%|TEA_0,00%"],
          },
          {
            installments: 3,
            installment_rate: 19.69,
            installment_amount: 18751.43,
            total_amount: 56254.3,
            labels: ["CFT_199,00%|TEA_150,00%"],
          },
        ],
      },
    ]);
    const r = await mp.cardPlans(47_000_00, "50317557");
    expect(f.mock.calls[0]?.[0]).toBe(
      "https://api.mercadopago.com/v1/payment_methods/installments?amount=47000.00&bin=50317557",
    );
    expect(r).toEqual({
      brand: "Mastercard",
      debit: false,
      plans: [
        { installments: 1, installmentCents: 47_000_00, totalCents: 47_000_00, interestFree: true, cft: "0,00%" },
        { installments: 3, installmentCents: 18_751_43, totalCents: 56_254_30, interestFree: false, cft: "199,00%" },
      ],
    });
  });
});

describe("MercadoPagoGateway · reintegros", () => {
  const replies = (...r: [number, unknown][]) => {
    const f = vi.spyOn(globalThis, "fetch");
    for (const [status, body] of r) f.mockResolvedValueOnce(new Response(JSON.stringify(body), { status }));
    return f;
  };

  it("devuelve el total de una orden de tarjeta sin monto en el cuerpo y con clave de idempotencia", async () => {
    const f = replies([
      201,
      {
        id: "ORDTST01",
        status: "processed",
        status_detail: "refunded",
        transactions: { refunds: [{ id: "REF01", status: "processed" }] },
      },
    ]);
    expect(await mp.refund({ paymentId: "ORDTST01", idempotencyKey: "r-1" })).toEqual({ pending: false });
    const [url, init] = f.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.mercadopago.com/v1/orders/ORDTST01/refund");
    expect(init.method).toBe("POST");
    expect(init.body).toBeUndefined();
    expect((init.headers as Record<string, string>)["X-Idempotency-Key"]).toBe("r-1");
  });

  it("dinero en cuenta va por la API de Payments; en proceso queda pendiente", async () => {
    const f = replies([201, { id: 9, payment_id: 123, status: "in_process" }]);
    expect(await mp.refund({ paymentId: "123", idempotencyKey: "r-2" })).toEqual({ pending: true });
    expect(f.mock.calls[0]?.[0]).toBe("https://api.mercadopago.com/v1/payments/123/refunds");
  });

  it("si ya estaba devuelta la da por hecha", async () => {
    replies([409, { errors: [{ code: "order_already_refunded" }] }]);
    expect(await mp.refund({ paymentId: "ORDTST01", idempotencyKey: "r-3" })).toEqual({ pending: false });
  });

  it("si falla consulta el pago y, si no se devolvió, explica qué revisar", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    replies([400, { message: "insufficient balance" }], [200, order("processed", "accredited")]);
    await expect(mp.refund({ paymentId: "ORDTST01", idempotencyKey: "r-4" })).rejects.toThrow(/saldo disponible/);
  });

  it("un reintegro rechazado por Payments no se da por hecho", async () => {
    replies([201, { id: 9, payment_id: 123, status: "rejected" }]);
    await expect(mp.refund({ paymentId: "123", idempotencyKey: "r-5" })).rejects.toThrow(/rechazó el reintegro/);
  });
});

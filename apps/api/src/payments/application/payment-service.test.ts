import { createHmac } from "node:crypto";
import {
  type CardPaymentInput,
  CardPaymentInputSchema,
  DEFAULT_PAYMENT_SETTINGS,
  PlaceOrderInputSchema,
} from "@mini-galu/contracts";
import { beforeEach, describe, expect, it } from "vitest";
import { CartService } from "../../cart/application/cart-service";
import { MemoryCarts, MemoryVariants, variant } from "../../cart/testing/in-memory";
import { CouponService } from "../../coupons/application/coupon-service";
import { MemoryCoupons } from "../../coupons/testing/in-memory";
import { CheckoutService } from "../../orders/application/checkout-service";
import { OrderPayments } from "../../orders/application/order-payments";
import { MemoryOrders } from "../../orders/testing/in-memory";
import { UnauthorizedError, ValidationError } from "../../shared/domain/errors";
import { type DomainEvent, EventBus } from "../../shared/events/event-bus";
import type { ImageStorage } from "../../shared/media/image-storage";
import { ShippingService } from "../../shipping/application/shipping-service";
import { TableShippingRates } from "../../shipping/infrastructure/table-shipping-rates";
import { MercadoPagoGateway } from "../infrastructure/mercadopago-gateway";
import { SimulatedGateway } from "../infrastructure/simulated-gateway";
import { PaymentService } from "./payment-service";
import type { GatewayPayment, PaymentSettingsStore } from "./ports";

const storage: ImageStorage = { url: (p) => `http://api/media/${p}`, save: async (p) => p };
const guest = { token: "t1" };

let orders: MemoryOrders;
let gateway: SimulatedGateway;
let settings: PaymentSettingsStore & { value: typeof DEFAULT_PAYMENT_SETTINGS };
let recorded: GatewayPayment[];
let events: DomainEvent[];
let service: PaymentService;
let number: string;

const card = (over: Partial<CardPaymentInput> = {}) =>
  CardPaymentInputSchema.parse({
    method: "credito",
    token: `tok-${Math.random()}`,
    paymentMethodId: "visa",
    installments: 6,
    payer: { email: "lucia@gmail.com" },
    ...over,
  });

beforeEach(async () => {
  const variants = new MemoryVariants([variant("maddie", "4", 2)]);
  orders = new MemoryOrders(variants);
  const cart = new CartService(new MemoryCarts(), variants, storage);
  const coupons = new CouponService(new MemoryCoupons());
  const bus = new EventBus();
  events = [];
  for (const t of ["PaymentApproved", "PaymentAmountMismatch"]) bus.on(t, (e) => void events.push(e));
  const checkout = new CheckoutService(
    cart,
    new ShippingService(new TableShippingRates()),
    coupons,
    orders,
    storage,
    undefined,
    () => "tok",
  );
  gateway = new SimulatedGateway();
  settings = {
    value: { ...DEFAULT_PAYMENT_SETTINGS },
    async get() {
      return this.value;
    },
    async save(s) {
      this.value = s;
    },
  };
  recorded = [];
  service = new PaymentService(
    gateway,
    { record: async (_o, _p, p) => void recorded.push(p) },
    settings,
    new OrderPayments(orders, cart, coupons, bus),
    bus,
    { web: "http://web", webhook: "http://api/payments/webhook" },
  );
  await cart.add(guest, { slug: "maddie", size: "4", qty: 1 });
  const placed = await checkout.place(
    guest,
    null,
    PlaceOrderInputSchema.parse({
      contact: { email: "lucia@gmail.com", firstName: "Lucía", lastName: "F", phone: "11 5555-1234" },
      shipping: {
        method: "domicilio",
        postalCode: "1414",
        province: "CABA",
        street: "Gurruchaga",
        number: "1234",
        city: "CABA",
      },
    }),
  );
  number = placed.number;
});

describe("PaymentService", () => {
  it("tarjeta aprobada: pedido nuevo y pago registrado", async () => {
    expect(await service.payCard(number, "tok", card())).toEqual({ outcome: "approved", message: "¡Pago aprobado!" });
    expect(orders.items[0]).toMatchObject({ status: "nuevo", paymentMethod: "credito", installments: 6 });
    expect(recorded).toHaveLength(1);
    expect(events.map((e) => e.type)).toEqual(["PaymentApproved"]);
  });

  it("rechazada: el pedido sigue esperando pago y se puede reintentar", async () => {
    const r = await service.payCard(number, "tok", card({ holderName: "FUND" }));
    expect(r).toEqual({ outcome: "rejected", message: "La tarjeta no tiene saldo suficiente. Probá con otra." });
    expect(orders.items[0]?.status).toBe("esperando_pago");
    expect((await service.payCard(number, "tok", card())).outcome).toBe("approved");
  });

  it("pendiente queda esperando pago", async () => {
    expect((await service.payCard(number, "tok", card({ holderName: "CONT" }))).outcome).toBe("pending");
    expect(orders.items[0]?.status).toBe("esperando_pago");
  });

  it("débito siempre en 1 pago; respeta medios y cuotas del panel", async () => {
    await service.payCard(number, "tok", card({ method: "debito", installments: 6 }));
    expect(orders.items[0]).toMatchObject({ paymentMethod: "debito", installments: 1 });
    settings.value = { ...settings.value, maxInstallments: 3, debito: false };
    await expect(service.payCard(number, "tok", card({ method: "debito" }))).rejects.toBeInstanceOf(ValidationError);
  });

  it("no cobra con token equivocado ni dos veces", async () => {
    await expect(service.payCard(number, "otro", card())).rejects.toThrow("No encontramos");
    await service.payCard(number, "tok", card());
    await expect(service.payCard(number, "tok", card())).rejects.toThrow("ya está pagado");
  });

  it("dinero en cuenta: vuelve de Mercado Pago y se confirma consultando el pago", async () => {
    const pref = await service.wallet(number, "tok");
    const back = new URL(pref.redirectUrl as string);
    expect(back.pathname).toBe("/checkout");
    expect(back.searchParams.get("pedido")).toBe(number);
    await service.syncReturn(number, "tok", back.searchParams.get("payment_id") as string);
    expect(orders.items[0]).toMatchObject({ status: "nuevo", paymentMethod: "dinero_cuenta" });
  });

  it("si el monto pagado no coincide no aprueba", async () => {
    gateway.payWithCard = async (req) => ({
      id: "x",
      status: "approved",
      statusDetail: "accredited",
      method: "credito",
      installments: 1,
      amountCents: req.amountCents - 100,
      orderId: req.orderId,
      raw: {},
    });
    await service.payCard(number, "tok", card());
    expect(orders.items[0]?.status).toBe("esperando_pago");
    expect(events.map((e) => e.type)).toEqual(["PaymentAmountMismatch"]);
  });

  it("webhook sin firma válida se rechaza", async () => {
    await expect(
      service.webhook({ type: "payment", dataId: "1", requestId: "r", signature: "" }),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });
});

describe("PaymentService.installments", () => {
  it("aplica el tope del panel y guarda la consulta una hora", async () => {
    let calls = 0;
    gateway.installments = async () => {
      calls++;
      return { interestFree: 6, max: 12 };
    };
    expect(await service.installments([39_000_00, 39_000_00])).toEqual({ 3900000: { interestFree: 6, max: 6 } });
    settings.value = { ...settings.value, maxInstallments: 3 };
    expect(await service.installments([39_000_00])).toEqual({ 3900000: { interestFree: 3, max: 3 } });
    expect(calls).toBe(1);
    settings.value = { ...settings.value, credito: false };
    expect(await service.installments([39_000_00])).toEqual({ 3900000: { interestFree: 1, max: 1 } });
  });
});

describe("MercadoPagoGateway.verifyWebhook", () => {
  const mp = new MercadoPagoGateway({
    accessToken: "x",
    publicKey: "y",
    webhookSecret: "secreto",
    mode: "prueba",
    notificationUrl: null,
  });
  const sign = (manifest: string) => createHmac("sha256", "secreto").update(manifest).digest("hex");

  it("acepta la firma del manifiesto id;request-id;ts", () => {
    const v1 = sign("id:123456;request-id:abc;ts:1704908010;");
    expect(mp.verifyWebhook({ dataId: "123456", requestId: "abc", signature: `ts=1704908010,v1=${v1}` })).toBe(true);
  });

  it("rechaza firmas alteradas o de otro pago", () => {
    const v1 = sign("id:123456;request-id:abc;ts:1704908010;");
    expect(mp.verifyWebhook({ dataId: "999", requestId: "abc", signature: `ts=1704908010,v1=${v1}` })).toBe(false);
    expect(mp.verifyWebhook({ dataId: "123456", requestId: "abc", signature: "ts=1,v1=00" })).toBe(false);
  });
});

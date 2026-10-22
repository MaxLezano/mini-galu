import { createHmac } from "node:crypto";
import {
  type CardPaymentInput,
  CardPaymentInputSchema,
  DEFAULT_PAYMENT_SETTINGS,
  PlaceOrderInputSchema,
} from "@mini-galu/contracts";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
import { SimulatedAndreaniRates } from "../../shipping/infrastructure/simulated-andreani-rates";
import { IN_REVIEW } from "../domain/outcome";
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
let nets: [string, number][];
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
    new ShippingService(new SimulatedAndreaniRates()),
    coupons,
    orders,
    storage,
    undefined,
    undefined,
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
  nets = [];
  service = new PaymentService(
    gateway,
    {
      record: async (_o, _p, p) => void recorded.push(p),
      markRefunded: async () => {},
      saveNet: async (_p, id, cents) => void nets.push([id, cents]),
      inReview: async () =>
        [...new Map(recorded.map((p) => [p.id, p])).values()]
          .filter((p) => IN_REVIEW.includes(p.status))
          .map((p) => p.id),
    },
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

  it("pendiente: las prendas quedan reservadas mientras Mercado Pago revisa (no vencen a los 30 minutos)", async () => {
    await service.payCard(number, "tok", card({ holderName: "CONT" }));
    const until = orders.items[0]?.reservedUntil?.getTime() ?? 0;
    expect(until - Date.now()).toBeGreaterThan(71 * 3_600_000);
    expect(await orders.expired(new Date(Date.now() + 3_600_000))).toEqual([]);
    expect((await orders.events(orders.items[0]?.id ?? "")).map((e) => e.kind)).toContain("payment_review");
  });

  it("respaldo del webhook: un pago en revisión que se aprueba después se resuelve al volver a consultarlo", async () => {
    await service.payCard(number, "tok", card({ holderName: "CONT" }));
    const pending = recorded[0] as GatewayPayment;
    vi.spyOn(gateway, "fetch").mockResolvedValue({ ...pending, status: "approved", statusDetail: "accredited" });
    expect(await service.reconcile()).toBe(1);
    expect(orders.items[0]?.status).toBe("nuevo");
    expect(events.map((e) => e.type)).toEqual(["PaymentApproved"]);
    // ya resuelto: no se vuelve a consultar
    expect(await service.reconcile()).toBe(0);
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

describe("PaymentService.netReceived", () => {
  it("guarda lo que acreditó el proveedor después de la comisión", async () => {
    gateway.netReceived = async () => 9_590_00;
    expect(await service.netReceived("simulado", "SIM-1")).toBe(9_590_00);
    expect(nets).toEqual([["SIM-1", 9_590_00]]);
  });

  it("sin dato del proveedor, de otro proveedor o si no responde: nada (no se estima)", async () => {
    expect(await service.netReceived("simulado", "SIM-1")).toBeNull();
    gateway.netReceived = async () => 1;
    expect(await service.netReceived("mercadopago", "ORD1")).toBeNull();
    gateway.netReceived = async () => {
      throw new Error("timeout");
    };
    const quiet = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await service.netReceived("simulado", "SIM-1")).toBeNull();
    quiet.mockRestore();
    expect(nets).toEqual([]);
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

describe("PaymentService.cardPlans", () => {
  const plans = [1, 3, 6, 12].map((n) => ({
    installments: n,
    installmentCents: 100,
    totalCents: 100 * n,
    interestFree: n === 1,
    cft: null,
  }));

  it("respeta el tope del panel y el débito va en un pago", async () => {
    gateway.cardPlans = async () => ({ brand: "Mastercard", debit: false, plans });
    expect((await service.cardPlans(number, "tok", "503175")).plans.map((p) => p.installments)).toEqual([1, 3, 6]);
    gateway.cardPlans = async () => ({ brand: "Maestro", debit: true, plans });
    expect((await service.cardPlans(number, "tok", "503175")).plans.map((p) => p.installments)).toEqual([1]);
    await expect(service.cardPlans(number, "otro", "503175")).rejects.toThrow("No encontramos");
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

import type { OrderStatus } from "@mini-galu/contracts";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryVariants } from "../../cart/testing/in-memory";
import { ConflictError, NotFoundError } from "../../shared/domain/errors";
import { type DomainEvent, EventBus } from "../../shared/events/event-bus";
import { MemoryOrders, MemoryRevocations } from "../testing/in-memory";
import type { OrderRecord } from "./ports";
import { Revocations } from "./revocations";

const day = 24 * 60 * 60 * 1000;
const now = new Date("2026-10-15T15:00:00Z");

let orders: MemoryOrders;
let store: MemoryRevocations;
let revocations: Revocations;
let published: DomainEvent[];

function order(number: number, status: OrderStatus, statusChangedAt = now): OrderRecord {
  const o = {
    id: `o${number}`,
    number,
    status,
    statusChangedAt,
    email: "Lucia@Gmail.com",
    firstName: "Lucía",
    lastName: "Fernández",
  } as OrderRecord;
  orders.items.push(o);
  return o;
}

beforeEach(() => {
  orders = new MemoryOrders(new MemoryVariants([]));
  orders.clock = () => now;
  store = new MemoryRevocations(orders);
  store.clock = () => now;
  const bus = new EventBus();
  published = [];
  bus.on("RevocationRequested", (e) => void published.push(e));
  revocations = new Revocations(
    orders,
    store,
    bus,
    () => now,
    () => 0.5,
  );
});

describe("Revocations.request", () => {
  it("con número y mail del pedido da un código, lo anota en el historial y avisa", async () => {
    order(1042, "preparando");
    const r = await revocations.request({ order: "mg-1042", email: "lucia@gmail.com", reason: "Me quedó chico" });
    expect(r).toEqual({
      code: expect.stringMatching(/^ARR-/),
      order: "MG-1042",
      requestedAt: now.toISOString(),
      inTime: true,
      repeated: false,
    });
    expect(orders.log.get("o1042")?.[0]).toMatchObject({
      kind: "revocation",
      detail: `Código ${r.code} · "Me quedó chico"`,
      auto: true,
    });
    expect(published[0]?.payload).toMatchObject({ number: "MG-1042", code: r.code, email: "Lucia@Gmail.com" });
    expect(orders.items[0]?.revocation?.code).toBe(r.code);
  });

  it("si la vuelve a pedir, devuelve el mismo código sin avisar de nuevo", async () => {
    order(1042, "nuevo");
    const first = await revocations.request({ order: "1042", email: "lucia@gmail.com", reason: "" });
    const again = await revocations.request({ order: "MG-1042", email: "lucia@gmail.com", reason: "otra vez" });
    expect(again).toMatchObject({ code: first.code, repeated: true });
    expect(published).toHaveLength(1);
    expect(orders.log.get("o1042")).toHaveLength(1);
  });

  it("fuera de los 10 días desde la entrega igual se registra, marcada", async () => {
    order(1042, "entregado", new Date(now.getTime() - 12 * day));
    const r = await revocations.request({ order: "MG-1042", email: "lucia@gmail.com", reason: "" });
    expect(r.inTime).toBe(false);
    expect(orders.log.get("o1042")?.[0]?.detail).toMatch(/más de 10 días/);
  });

  it("mismo error si el pedido no existe o el mail no coincide", async () => {
    order(1042, "nuevo");
    await expect(revocations.request({ order: "MG-1042", email: "otra@gmail.com", reason: "" })).rejects.toThrow(
      NotFoundError,
    );
    await expect(revocations.request({ order: "MG-9999", email: "lucia@gmail.com", reason: "" })).rejects.toThrow(
      "No encontramos un pedido con ese número y ese mail",
    );
    await expect(revocations.request({ order: "hola", email: "lucia@gmail.com", reason: "" })).rejects.toThrow(
      NotFoundError,
    );
  });

  it("no registra nada para un pedido sin pagar o cancelado", async () => {
    order(1042, "esperando_pago");
    order(1043, "cancelado");
    await expect(revocations.request({ order: "MG-1042", email: "lucia@gmail.com", reason: "" })).rejects.toThrow(
      ConflictError,
    );
    await expect(revocations.request({ order: "MG-1043", email: "lucia@gmail.com", reason: "" })).rejects.toThrow(
      ConflictError,
    );
    expect(store.byOrder.size).toBe(0);
    expect(published).toHaveLength(0);
  });
});

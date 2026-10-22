import { describe, expect, it } from "vitest";
import { exchangeBlocked, exchangeDetail } from "./exchange";

const o = { kind: "prendas" as const, status: "entregado" as const };
const item = { size: "4", qty: 2 };

describe("cambio de talle", () => {
  it("se puede con un pedido pagado y stock del talle nuevo", () => {
    expect(exchangeBlocked(o, item, { size: "6", stock: 1 }, 1)).toBeNull();
    expect(exchangeBlocked({ ...o, status: "nuevo" }, item, { size: "6", stock: 2 }, 2)).toBeNull();
  });

  it("no, sin pagar, cancelado, reintegrado o en la compra de una gift card", () => {
    for (const status of ["esperando_pago", "cancelado", "reembolsado"] as const)
      expect(exchangeBlocked({ ...o, status }, item, { size: "6", stock: 1 }, 1)).toMatch(/pedido pagado/);
    expect(exchangeBlocked({ ...o, kind: "giftcard" }, item, { size: "6", stock: 1 }, 1)).toMatch(/pedido pagado/);
  });

  it("dice qué falta: el talle, el stock o las unidades", () => {
    expect(exchangeBlocked(o, item, { size: "6", stock: 0 }, 1)).toBe("No queda talle 6");
    expect(exchangeBlocked(o, item, { size: "6", stock: 1 }, 2)).toBe("No queda talle 6 para 2");
    expect(exchangeBlocked(o, item, { size: "4", stock: 3 }, 1)).toBe("Elegí un talle distinto");
    expect(exchangeBlocked(o, item, null, 1)).toBe("Ese modelo no viene en ese talle");
    expect(exchangeBlocked(o, item, { size: "6", stock: 5 }, 3)).toBe("El pedido tiene 2 de esa prenda");
    expect(exchangeBlocked(o, null, { size: "6", stock: 5 }, 1)).toMatch(/ya no está/);
  });

  it("línea del historial", () => {
    expect(
      exchangeDetail({ name: "Maddie", from: "4", to: "6", qty: 1, restocked: true, reason: "le quedó chico" }),
    ).toBe('Maddie · talle 4 → 6 · talle 4 al stock · "le quedó chico"');
    expect(exchangeDetail({ name: "Maddie", from: "4", to: "6", qty: 2, restocked: false, reason: "" })).toBe(
      "Maddie (2) · talle 4 → 6",
    );
  });
});

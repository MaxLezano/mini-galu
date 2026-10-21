import { describe, expect, it } from "vitest";
import { revocationBlocked, revocationCode, revocationInTime } from "./revocation";

const day = 24 * 60 * 60 * 1000;
const now = new Date("2026-10-15T15:00:00Z");

describe("botón de arrepentimiento", () => {
  it("arma un código ARR- con 6 caracteres que no se confunden", () => {
    expect(revocationCode(() => 0)).toBe("ARR-222222");
    expect(revocationCode(() => 0.999)).toBe("ARR-ZZZZZZ");
    expect(revocationCode()).toMatch(/^ARR-[2-9A-HJKMNP-Z]{6}$/);
  });

  it("antes de recibirlo siempre está en plazo; entregado, 10 días corridos", () => {
    const old = new Date(now.getTime() - 40 * day);
    expect(revocationInTime({ status: "preparando", statusChangedAt: old }, now)).toBe(true);
    expect(revocationInTime({ status: "entregado", statusChangedAt: new Date(now.getTime() - 10 * day) }, now)).toBe(
      true,
    );
    expect(revocationInTime({ status: "entregado", statusChangedAt: new Date(now.getTime() - 11 * day) }, now)).toBe(
      false,
    );
  });

  it("no se pide la baja de un pedido sin pagar o ya cancelado", () => {
    expect(revocationBlocked("esperando_pago")).toMatch(/no está pago/);
    expect(revocationBlocked("cancelado")).toMatch(/ya está cancelado/);
    expect(revocationBlocked("reembolsado")).toMatch(/ya está cancelado/);
    expect(revocationBlocked("en_camino")).toBeNull();
    expect(revocationBlocked("entregado")).toBeNull();
  });
});

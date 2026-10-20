import { describe, expect, it } from "vitest";
import { deliverAt, expiresAt, giftcardCode, normalizeCode, usable } from "./giftcard";

describe("gift cards", () => {
  it("código legible sin letras confusas y normalizado como lo escriban", () => {
    const code = giftcardCode(new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7]));
    expect(code).toBe("GALU-ABCD-EFGH");
    expect(giftcardCode(crypto.getRandomValues(new Uint8Array(8)))).toMatch(
      /^GALU-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/,
    );
    expect(normalizeCode(" galu 7kq2 m9xa ")).toBe("GALU-7KQ2-M9XA");
    expect(normalizeCode("7KQ2M9XA")).toBe("GALU-7KQ2-M9XA");
  });

  it("vence a los 6 meses y se manda el día elegido a las 9 de Argentina", () => {
    expect(expiresAt(new Date("2026-10-14T12:00:00Z"), 6).toISOString()).toBe("2027-04-14T12:00:00.000Z");
    expect(expiresAt(new Date("2026-10-14T12:00:00Z"), 2).toISOString()).toBe("2026-12-14T12:00:00.000Z");
    expect(deliverAt("2026-11-14")?.toISOString()).toBe("2026-11-14T12:00:00.000Z");
    expect(deliverAt(null)).toBeNull();
  });

  it("se puede usar si está activa, con saldo y sin vencer", () => {
    const now = new Date("2026-10-14T00:00:00Z");
    const ok = { status: "activa", balanceCents: 100, expiresAt: new Date("2027-01-01T00:00:00Z") };
    expect(usable(ok, now)).toBeNull();
    expect(usable({ ...ok, balanceCents: 0 }, now)).toContain("saldo");
    expect(usable({ ...ok, expiresAt: new Date("2026-01-01T00:00:00Z") }, now)).toContain("venció");
    expect(usable({ ...ok, status: "esperando_pago" }, now)).toContain("activa");
  });
});

import { describe, expect, it } from "vitest";
import { CatalogQuerySchema, WaitlistRequestSchema } from "./catalog";

describe("CatalogQuerySchema", () => {
  it("acepta listas separadas por coma y aplica defaults", () => {
    const q = CatalogQuerySchema.parse({ talle: "6,8", ocasion: "bautismo" });
    expect(q.talle).toEqual(["6", "8"]);
    expect(q.ocasion).toEqual(["bautismo"]);
    expect(q.instock).toBe(true);
    expect(q.sort).toBe("new");
  });

  it("rechaza talles inexistentes", () => {
    expect(CatalogQuerySchema.safeParse({ talle: "12" }).success).toBe(false);
  });

  it("permite ver sin stock con instock=0", () => {
    expect(CatalogQuerySchema.parse({ instock: "0" }).instock).toBe(false);
  });
});

describe("WaitlistRequestSchema", () => {
  it("valida WhatsApp y email según el canal", () => {
    const base = { slug: "samanta", size: "6" } as const;
    expect(WaitlistRequestSchema.safeParse({ ...base, channel: "whatsapp", contact: "11 5555-1234" }).success).toBe(
      true,
    );
    expect(WaitlistRequestSchema.safeParse({ ...base, channel: "email", contact: "no-es-mail" }).success).toBe(false);
    expect(WaitlistRequestSchema.safeParse({ ...base, channel: "email", contact: "lucia@gmail.com" }).success).toBe(
      true,
    );
  });
});

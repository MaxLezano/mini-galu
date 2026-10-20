import type { AdminSizeAlert, AdminSubscribers } from "@mini-galu/contracts";
import { describe, expect, it } from "vitest";
import { contactHref, filterRows, sizeLabel, sourceLabel, tabCounts } from "./subscribers-view";

const alert = (over: Partial<AdminSizeAlert> = {}): AdminSizeAlert => ({
  id: "w1",
  channel: "email",
  contact: "ana@mail.com",
  name: null,
  customerEmail: null,
  createdAt: "2026-10-01T15:00:00.000Z",
  status: "activo",
  statusAt: null,
  product: { id: "p1", name: "Vestido Maddie", slug: "vestido-maddie" },
  size: "4",
  ...over,
});

describe("suscriptores", () => {
  it("cuenta solo los que siguen anotados", () => {
    const s: AdminSubscribers = {
      cartas: [],
      lanzamientos: [],
      talles: [alert(), alert({ id: "w2", status: "avisado" })],
    };
    expect(tabCounts(s)).toEqual({ cartas: 0, lanzamientos: 0, talles: 1 });
  });

  it("busca por contacto, nombre o prenda, sin tildes; y puede dejar solo los activos", () => {
    const rows = [
      alert(),
      alert({ id: "w2", contact: "11 5555-1234", channel: "whatsapp", name: "Lucía Fernández", status: "avisado" }),
      alert({ id: "w3", product: { id: "p2", name: "Mono Verde", slug: "mono-verde" } }),
    ];
    expect(filterRows(rows, "lucia", false).map((r) => r.id)).toEqual(["w2"]);
    expect(filterRows(rows, "MADDIE", false).map((r) => r.id)).toEqual(["w1", "w2"]);
    expect(filterRows(rows, "5555", true)).toEqual([]);
    expect(filterRows(rows, "", true).map((r) => r.id)).toEqual(["w1", "w3"]);
  });

  it("arma el link para escribirle", () => {
    expect(contactHref("email", "ana@mail.com")).toBe("mailto:ana@mail.com");
    expect(contactHref("whatsapp", "11 5555-1234")).toBe("https://wa.me/5491155551234");
    expect(contactHref("whatsapp", "+54 9 11 5555-1234")).toBe("https://wa.me/5491155551234");
  });

  it("textos de talle y origen", () => {
    expect(sizeLabel("4")).toBe("T4");
    expect(sizeLabel(null)).toBe("Cualquier talle");
    expect(sourceLabel("registro")).toBe("Al registrarse");
    expect(sourceLabel("otro")).toBe("otro");
  });
});

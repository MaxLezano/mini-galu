import type { AdminCustomer } from "@mini-galu/contracts";
import { describe, expect, it } from "vitest";
import { filterCustomers, inDaysLabel, whatsappHref } from "./customer-view";

const c = (over: Partial<AdminCustomer>): AdminCustomer => ({
  email: "a@b.com",
  name: "Lucía Fernández",
  phone: null,
  city: "CABA",
  since: "2026-05-01T12:00:00.000Z",
  hasAccount: false,
  orders: 1,
  spentCents: 0,
  children: [],
  nextBirthday: null,
  ...over,
});

describe("filtros de clientes", () => {
  const list = [
    c({ email: "lu@x.com" }),
    c({ email: "sole@x.com", name: "Sole Paz", city: "Córdoba", orders: 3 }),
    c({
      email: "mia@x.com",
      name: "Mía",
      since: "2026-10-02T12:00:00.000Z",
      nextBirthday: { name: "Olivia", date: "2026-10-20", inDays: 6 },
    }),
  ];
  const emails = (f: Parameters<typeof filterCustomers>[1], q = "") =>
    filterCustomers(list, f, q, "2026-10").map((x) => x.email);

  it("por chip y por búsqueda", () => {
    expect(emails("all")).toHaveLength(3);
    expect(emails("bday")).toEqual(["mia@x.com"]);
    expect(emails("repeat")).toEqual(["sole@x.com"]);
    expect(emails("new")).toEqual(["mia@x.com"]);
    expect(emails("all", "córdoba")).toEqual(["sole@x.com"]);
    expect(emails("all", "LU@X")).toEqual(["lu@x.com"]);
  });

  it("textos de ayuda", () => {
    expect(whatsappHref("+5491155551234")).toBe("https://wa.me/5491155551234");
    expect([0, 1, 6].map(inDaysLabel)).toEqual(["es hoy", "mañana", "en 6 días"]);
  });
});

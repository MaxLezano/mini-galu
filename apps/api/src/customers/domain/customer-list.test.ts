import { formatARS } from "@mini-galu/contracts";
import { describe, expect, it } from "vitest";
import { birthdayAfter, buildCustomers, customerKpis, customersCsv, nextBirthday } from "./customer-list";

const order = (over: Partial<Parameters<typeof buildCustomers>[0][number]> = {}) => ({
  email: "lucia@gmail.com",
  firstName: "Lucía",
  lastName: "Fernández",
  phone: "+5491155551234",
  city: "CABA",
  createdAt: new Date("2026-05-10T12:00:00Z"),
  paid: true,
  totalCents: 40_000_00,
  ...over,
});

describe("lista de clientes", () => {
  it("el próximo cumple: este año o el que viene, y el 29/2 se festeja el 28", () => {
    expect(birthdayAfter("2021-11-14", "2026-10-14")).toEqual({ date: "2026-11-14", inDays: 31 });
    expect(birthdayAfter("2021-10-14", "2026-10-14")).toEqual({ date: "2026-10-14", inDays: 0 });
    expect(birthdayAfter("2021-03-01", "2026-10-14")).toEqual({ date: "2027-03-01", inDays: 138 });
    expect(birthdayAfter("2020-02-29", "2026-10-14").date).toBe("2027-02-28");
    expect(
      nextBirthday(
        [
          { name: "Olivia", size: "6", birthday: "2021-12-01" },
          { name: "Juana", size: "4", birthday: "2022-10-20" },
          { name: "Sin fecha", size: null, birthday: null },
        ],
        "2026-10-14",
      ),
    ).toEqual({ name: "Juana", date: "2026-10-20", inDays: 6 });
  });

  it("junta pedidos (con o sin cuenta) por mail y suma solo lo pagado", () => {
    const list = buildCustomers(
      [
        order(),
        order({ email: "LUCIA@gmail.com", createdAt: new Date("2026-09-01T12:00:00Z"), city: "Córdoba" }),
        order({ paid: false, totalCents: 99_000_00 }),
        order({ email: "sole@gmail.com", firstName: "Sole", lastName: "Paz", city: null, totalCents: 10_000_00 }),
      ],
      [
        {
          email: "sole@gmail.com",
          firstName: "Soledad",
          lastName: "Paz",
          phone: null,
          createdAt: new Date("2026-01-02T12:00:00Z"),
          children: [{ name: "Mía", size: "8", birthday: "2018-10-30" }],
        },
        {
          email: "nueva@gmail.com",
          firstName: "Ana",
          lastName: "Gómez",
          phone: "+5491100000000",
          createdAt: new Date("2026-10-01T12:00:00Z"),
          children: [],
        },
      ],
      "2026-10-14",
    );
    expect(list.map((c) => c.email)).toEqual(["lucia@gmail.com", "sole@gmail.com", "nueva@gmail.com"]);
    expect(list[0]).toMatchObject({ orders: 2, spentCents: 80_000_00, city: "Córdoba", hasAccount: false });
    expect(list[1]).toMatchObject({
      name: "Sole Paz",
      since: "2026-01-02T12:00:00.000Z",
      hasAccount: true,
      nextBirthday: { name: "Mía", inDays: 16 },
    });
    expect(list[2]).toMatchObject({ orders: 0, spentCents: 0, name: "Ana Gómez" });
    expect(customerKpis(list)).toEqual({ customers: 3, repeat: 1, birthdaysSoon: 1, children: 1 });
  });

  it("exporta un CSV que abre Excel en español", () => {
    const csv = customersCsv(buildCustomers([order({ lastName: 'Fernández; "Lu"' })], [], "2026-10-14"), formatARS);
    expect(csv.startsWith("﻿Nombre;Email")).toBe(true);
    expect(csv).toContain('"Lucía Fernández; ""Lu"""');
    expect(csv).toContain("$40.000");
  });
});

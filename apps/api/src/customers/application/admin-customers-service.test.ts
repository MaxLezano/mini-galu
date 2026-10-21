import { DEFAULT_POLICIES, type PointsSummary } from "@mini-galu/contracts";
import { describe, expect, it } from "vitest";
import { NotFoundError } from "../../shared/domain/errors";
import { MemoryAdminCustomers } from "../testing/in-memory";
import { AdminCustomersService } from "./admin-customers-service";

describe("clientes en el panel", () => {
  it("lista con números, ficha con pedidos y nota, y CSV", async () => {
    const repo = new MemoryAdminCustomers();
    repo.orders = [
      {
        email: "lucia@gmail.com",
        firstName: "Lucía",
        lastName: "Fernández",
        phone: "+5491155551234",
        city: "CABA",
        createdAt: new Date("2026-09-01T12:00:00Z"),
        paid: true,
        totalCents: 40_000_00,
      },
    ];
    repo.accounts = [
      {
        email: "lucia@gmail.com",
        firstName: "Lucía",
        lastName: "Fernández",
        phone: null,
        createdAt: new Date("2026-08-01T12:00:00Z"),
        children: [{ name: "Olivia", size: "6", birthday: "2021-10-20" }],
      },
    ];
    repo.collections.set("lucia@gmail.com", ["Verano 2027"]);
    // 23:30 del 13 en Argentina: para el cumple todavía es 13
    const svc = new AdminCustomersService(repo, () => new Date("2026-10-14T02:30:00Z"));

    const { customers, kpis } = await svc.list();
    expect(kpis).toEqual({ customers: 1, repeat: 0, birthdaysSoon: 1, children: 1 });
    expect(customers[0]?.nextBirthday).toEqual({ name: "Olivia", date: "2026-10-20", inDays: 7 });

    await svc.setNote(" Lucia@gmail.com ", "Prefiere retirar en el taller");
    const d = await svc.detail("LUCIA@gmail.com");
    expect(d).toMatchObject({ likes: ["Verano 2027"], note: "Prefiere retirar en el taller", orders: 1 });
    await expect(svc.detail("nadie@gmail.com")).rejects.toThrow(NotFoundError);
    expect(await svc.csv()).toContain("lucia@gmail.com");
  });

  it("la ficha muestra los puntos por reseñas; apagados y sin nada, no", async () => {
    const repo = new MemoryAdminCustomers();
    repo.orders = [
      {
        email: "lucia@gmail.com",
        firstName: "Lucía",
        lastName: "Fernández",
        phone: "+5491155551234",
        city: "CABA",
        createdAt: new Date("2026-09-01T12:00:00Z"),
        paid: true,
        totalCents: 40_000_00,
      },
    ];
    let summary: PointsSummary = { rules: DEFAULT_POLICIES.reviewPoints, balance: 30, coupons: [] };
    const asked: string[] = [];
    const svc = new AdminCustomersService(repo, undefined, {
      forEmail: async (email) => {
        asked.push(email);
        return summary;
      },
    });
    expect((await svc.detail("Lucia@Gmail.com")).points).toEqual(summary);
    expect(asked).toEqual(["lucia@gmail.com"]);
    summary = { ...summary, rules: { ...summary.rules, enabled: false }, balance: 0 };
    expect((await svc.detail("lucia@gmail.com")).points).toBeNull();
    // apagados pero con canjes: se siguen viendo
    summary = {
      ...summary,
      coupons: [{ code: "PUNTOS-AB12C", label: "10% de descuento", endsAt: "2026-12-01T00:00:00Z", used: false }],
    };
    expect((await svc.detail("lucia@gmail.com")).points?.coupons).toHaveLength(1);
  });
});

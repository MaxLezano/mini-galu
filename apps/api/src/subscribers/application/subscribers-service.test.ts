import { beforeEach, describe, expect, it } from "vitest";
import { contactKey } from "../domain/contact";
import { MemorySubscribers } from "../testing/in-memory";
import { SubscribersService } from "./subscribers-service";

const d = (s: string) => new Date(`${s}T12:00:00-03:00`);
const launch = { id: "l1", title: "Primavera", startsAt: d("2026-11-01") };
const product = { id: "p1", name: "Vestido Maddie", slug: "vestido-maddie" };

describe("contactKey", () => {
  it("el mail en minúsculas y el WhatsApp por sus últimos 10 dígitos", () => {
    expect(contactKey("email", " Lucia@Mail.com ")).toBe("lucia@mail.com");
    expect(contactKey("whatsapp", "11 5555-1234")).toBe("1155551234");
    expect(contactKey("whatsapp", "+5491155551234")).toBe("1155551234");
    expect(contactKey("whatsapp", "123")).toBeNull();
  });
});

describe("SubscribersService", () => {
  let repo: MemorySubscribers;
  let svc: SubscribersService;
  beforeEach(() => {
    repo = new MemorySubscribers();
    svc = new SubscribersService(repo);
  });

  it("cartas: de la más nueva a la más vieja, con las bajas marcadas", async () => {
    repo.letters = [
      { id: "a", email: "ana@mail.com", source: "footer", createdAt: d("2026-09-01"), unsubscribedAt: null },
      {
        id: "b",
        email: "bea@mail.com",
        source: "registro",
        createdAt: d("2026-10-01"),
        unsubscribedAt: d("2026-10-10"),
      },
    ];
    const { cartas } = await svc.list();
    expect(cartas.map((r) => [r.contact, r.status, r.source])).toEqual([
      ["bea@mail.com", "baja", "registro"],
      ["ana@mail.com", "activo", "footer"],
    ]);
    expect(cartas[0]?.statusAt).toBe(d("2026-10-10").toISOString());
  });

  it("lanzamientos y talles: activo hasta que se avisa", async () => {
    repo.launches = [
      { id: "s1", launch, channel: "email", contact: "ana@mail.com", createdAt: d("2026-10-02"), notifiedAt: null },
    ];
    repo.alerts = [
      {
        id: "w1",
        product,
        size: "4",
        channel: "whatsapp",
        contact: "11 5555-1234",
        createdAt: d("2026-10-03"),
        notifiedAt: d("2026-10-05"),
      },
      {
        id: "w2",
        product,
        size: null,
        channel: "email",
        contact: "x@mail.com",
        createdAt: d("2026-10-04"),
        notifiedAt: null,
      },
    ];
    const r = await svc.list();
    expect(r.lanzamientos[0]).toMatchObject({ status: "activo", launch: { title: "Primavera" } });
    expect(r.talles.map((t) => [t.id, t.size, t.status])).toEqual([
      ["w2", null, "activo"],
      ["w1", "4", "avisado"],
    ]);
  });

  it("le pone nombre al contacto si coincide con una cuenta o un pedido (gana el más reciente)", async () => {
    repo.people = [
      { email: "lucia@mail.com", phone: "+5491155551234", name: "Lucía Fernández", at: d("2026-01-01") },
      { email: "lucia@mail.com", phone: null, name: "Lucía F. Gómez", at: d("2026-06-01") },
    ];
    repo.letters = [
      { id: "a", email: "Lucia@mail.com", source: "footer", createdAt: d("2026-09-01"), unsubscribedAt: null },
    ];
    repo.alerts = [
      {
        id: "w1",
        product,
        size: "4",
        channel: "whatsapp",
        contact: "11 5555-1234",
        createdAt: d("2026-10-03"),
        notifiedAt: null,
      },
      {
        id: "w2",
        product,
        size: "6",
        channel: "email",
        contact: "nadie@mail.com",
        createdAt: d("2026-10-01"),
        notifiedAt: null,
      },
    ];
    const r = await svc.list();
    expect(r.cartas[0]).toMatchObject({ name: "Lucía F. Gómez", customerEmail: "lucia@mail.com" });
    expect(r.talles.map((t) => [t.name, t.customerEmail])).toEqual([
      ["Lucía Fernández", "lucia@mail.com"],
      [null, null],
    ]);
  });
});

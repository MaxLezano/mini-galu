import { beforeEach, describe, expect, it } from "vitest";
import { ConflictError } from "../../shared/domain/errors";
import {
  MemoryAutomationOrders,
  MemoryAutomationSettings,
  MemoryBirthdays,
  MemoryIdleCarts,
  MemoryLaunchSignups,
  MemoryLowStock,
  MemoryMessenger,
  MemoryRunLog,
  MemorySuggestions,
  MemoryWaitlist,
} from "../testing/in-memory";
import { AutomationService } from "./automation-service";
import type { IdleCart } from "./ports";

const DAY = 86_400_000;
const channels = {
  mail: "conectado",
  whatsapp: "sin_conectar",
  mercadopago: "simulado",
  andreani: "simulado",
} as const;

let now: Date;
let settings: MemoryAutomationSettings;
let runs: MemoryRunLog;
let messenger: MemoryMessenger;
let orders: MemoryAutomationOrders;
let waitlist: MemoryWaitlist;
let lowStock: MemoryLowStock;
let kids: MemoryBirthdays;
let suggestions: MemorySuggestions;
let carts: MemoryIdleCarts;
let launches: MemoryLaunchSignups;
let auto: AutomationService;

beforeEach(() => {
  now = new Date("2026-10-14T12:00:00-03:00");
  settings = new MemoryAutomationSettings();
  runs = new MemoryRunLog();
  messenger = new MemoryMessenger(new Map([["o1", "lucia@gmail.com"]]));
  orders = new MemoryAutomationOrders();
  orders.orders.set("o1", {
    id: "o1",
    number: "MG-1042",
    firstName: "Lucía",
    lastName: "Fernández",
    email: "lucia@gmail.com",
    shippingMethod: "domicilio",
    pickupLabel: null,
    accessToken: "tok1",
  });
  orders.orders.set("o2", {
    id: "o2",
    number: "MG-1043",
    firstName: "Carla",
    lastName: "Méndez",
    email: "carla@gmail.com",
    shippingMethod: "taller",
    pickupLabel: "Jue 8 · 10 a 13 h",
    accessToken: "tok2",
  });
  waitlist = new MemoryWaitlist();
  lowStock = new MemoryLowStock();
  kids = new MemoryBirthdays();
  suggestions = new MemorySuggestions();
  carts = new MemoryIdleCarts();
  launches = new MemoryLaunchSignups();
  auto = new AutomationService(
    settings,
    runs,
    messenger,
    orders,
    waitlist,
    lowStock,
    kids,
    suggestions,
    carts,
    launches,
    {
      launch: "http://web/#lanzamiento",
      tracking: (n, t) => `http://web/seguimiento?pedido=${n}&t=${t}`,
      product: (s) => `http://web/producto/${s}`,
      catalog: (size) => `http://web/catalogo?talle=${size}`,
      bag: "http://web/ingresar?volver=%2Fcheckout",
      site: "http://web",
      workshop: async () => "Villa Crespo, CABA",
      review: (n, t) => `http://web/resena/${n}?t=${t}`,
    },
    () => now,
  );
});

describe("automatizaciones", () => {
  it("pago aprobado: manda el mail con el mensaje de la regla (editable) y lo anota", async () => {
    await auto.update("pago_aprobado", { message: "Gracias {nombre}, ya tenemos tu pedido #{pedido}." });
    await auto.paymentApproved("o1");
    expect(messenger.sent).toEqual([
      { kind: "pago", to: "lucia@gmail.com", body: "Gracias Lucía, ya tenemos tu pedido #MG-1042." },
    ]);
    expect(orders.history[0]?.title).toBe("Mail de confirmación enviado");
    expect(runs.list[0]).toMatchObject({
      rule: "pago_aprobado",
      subject: "#MG-1042 · Lucía Fernández",
      channel: "mail",
    });

    await auto.update("pago_aprobado", { on: false });
    await auto.paymentApproved("o1");
    expect(messenger.sent).toHaveLength(1); // pausada: no sale nada
  });

  it("despachado con el link de seguimiento y listo para retirar con el horario", async () => {
    await auto.statusChanged("o1", "en_camino");
    await auto.statusChanged("o2", "listo");
    await auto.statusChanged("o1", "listo"); // un envío listo no avisa (sale cuando Andreani lo retira)
    expect(messenger.sent.map((m) => m.subject)).toEqual([
      "Tu pedido #MG-1042 ya salió",
      "Tu pedido #MG-1043 está listo para retirar",
    ]);
    expect(messenger.sent[0]?.body).toContain("http://web/seguimiento?pedido=MG-1042&t=tok1");
    expect(messenger.sent[1]?.body).toBe(
      "Hola Carla! Tu pedido #MG-1043 está listo para retirar en el taller (Villa Crespo, CABA). Te esperamos el Jue 8 · 10 a 13 h.",
    );
  });

  it("a los 3 días de entregado pide una reseña, una sola vez", async () => {
    orders.delivered.set("o1", new Date(now.getTime() - 2 * DAY));
    expect(await auto.askReviews()).toBe(0);
    now = new Date(now.getTime() + 2 * DAY);
    expect(await auto.askReviews()).toBe(1);
    expect(await auto.askReviews()).toBe(0);
    expect(messenger.sent[0]?.subject).toBe("¿Cómo le quedó? ♡");
    // el botón lleva a reseñar las prendas del pedido, sin cuenta
    expect(messenger.ctas[0]).toEqual({ label: "Dejar mi reseña", url: "http://web/resena/MG-1042?t=tok1" });
  });

  it("volvió un talle: mail a los anotados por mail; los de WhatsApp quedan esperando con un aviso", async () => {
    waitlist.entries.push(
      { id: "w1", productId: "p1", size: "6", channel: "email", contact: "Ana@Gmail.com", notifiedAt: null },
      { id: "w2", productId: "p1", size: "6", channel: "whatsapp", contact: "+5491155551234", notifiedAt: null },
      { id: "w3", productId: "p1", size: "8", channel: "email", contact: "otro@gmail.com", notifiedAt: null },
    );
    await auto.replenished({ productId: "p1", slug: "set-maddie", name: "Set Maddie", sizes: [{ size: "6" }] });
    expect(messenger.sent).toEqual([
      expect.objectContaining({ to: "Ana@Gmail.com", subject: "Volvió el talle 6 del Set Maddie" }),
    ]);
    expect(waitlist.entries.map((e) => e.notifiedAt !== null)).toEqual([true, false, false]);
    expect(runs.list.map((r) => [r.status, r.contact ?? null])).toEqual([
      ["ok", "ana@gmail.com"],
      ["warn", null],
    ]);
  });

  it("stock bajo: aviso en el panel una vez por talle", async () => {
    lowStock.items = [{ key: "v1", label: "Vestido Samanta T10" }];
    expect(await auto.checkLowStock()).toBe(1);
    expect(await auto.checkLowStock()).toBe(0);
    expect(runs.list[0]).toMatchObject({ channel: "panel", detail: "Quedó en 1" });
  });

  it("panel: reglas, métricas del mes y las que no se pueden tocar", async () => {
    await auto.paymentApproved("o1");
    await auto.linkReminder({
      orderId: "o1",
      number: "MG-1042",
      firstName: "Lucía",
      email: "lucia@gmail.com",
      totalCents: 100,
      payUrl: "http://web/pagar/MG-1042",
      reservedUntilLabel: null,
    });
    runs.paid.set("o1", new Date(now.getTime() + 1000));
    const a = await auto.admin(channels);
    expect(a.rules.find((r) => r.key === "pago_aprobado")).toMatchObject({ on: true, runs: 1 });
    expect(a.rules.find((r) => r.key === "bolsa_abandonada")).toMatchObject({ on: true });
    expect(a.rules.find((r) => r.key === "cumple")).toMatchObject({ on: true });
    expect(a.rules.find((r) => r.key === "etiqueta")).toMatchObject({ on: true, message: null });
    expect(a.stats).toMatchObject({ sent: { mail: 2, whatsapp: 0 }, remindedLinks: 1, recoveredLinks: 1 });
    await expect(auto.update("etiqueta", { on: false })).rejects.toBeInstanceOf(ConflictError);
    await expect(auto.update("stock_bajo", { message: "x" })).rejects.toThrow("no manda mensajes");
  });

  it("enviarme una prueba: todos los mensajes activos con datos de ejemplo", async () => {
    await auto.update("despachado", { on: false });
    const n = await auto.test("gaby@minigalu.com.ar");
    expect(n).toBe(8); // pago, entregado, listo para retirar, volvió un talle, lanzamiento, link, bolsa y cumple
    expect(messenger.sent.every((m) => m.to === "gaby@minigalu.com.ar" && m.subject?.startsWith("[Prueba]"))).toBe(
      true,
    );
    expect(messenger.sent[0]?.body).toContain("Lucía");
  });

  describe("se acerca un cumple", () => {
    const olivia = {
      childId: "c1",
      name: "Olivia",
      birthday: "2021-10-29", // faltan 15 días
      size: "6",
      parentFirstName: "Lucía",
      email: "Lucia@Gmail.com",
    };
    beforeEach(() => {
      suggestions.bySize.set(
        "6",
        ["Vestido Samanta", "Set Maddie", "Vestido Elsa", "Vestido Rebeca"].map((name) => ({
          name,
          priceCents: 3_200_000,
          imageUrl: "http://api/media/x.webp",
          url: "http://web/producto/x",
        })),
      );
    });

    it("a 15 días manda ideas en su talle con 3 prendas, una sola vez por cumple", async () => {
      kids.children = [olivia];
      expect(await auto.birthdays()).toBe(1);
      expect(await auto.birthdays()).toBe(0);
      expect(messenger.sent).toEqual([
        {
          kind: "mensaje",
          to: "Lucia@Gmail.com",
          subject: "Se viene el cumple de Olivia ♡",
          eyebrow: "Faltan 15 días · cumple de Olivia",
          body: "Hola Lucía! Se viene el cumple de Olivia. Te dejamos ideas en talle 6: http://web/catalogo?talle=6",
          products: expect.any(Array),
        },
      ]);
      expect(messenger.sent[0]?.products).toHaveLength(3);
      expect(runs.list[0]).toMatchObject({
        rule: "cumple",
        subject: "Cumple de Olivia · Lucía",
        subjectKey: "cumple:c1:2026",
        contact: "lucia@gmail.com",
      });
      // con un cupón "Mail de cumpleaños" vigente, va en el mail
      kids.currentCoupon = { code: "CUMPLE15", label: "15% de descuento" };
      kids.children = [{ ...olivia, childId: "c2", name: "Emma" }];
      expect(await auto.birthdays()).toBe(1);
      expect(messenger.sent[1]?.body).toContain("con el código CUMPLE15 tenés 15% de descuento");
      kids.children = [olivia];
      // al año siguiente vuelve a salir
      now = new Date("2027-10-14T12:00:00-03:00");
      expect(await auto.birthdays()).toBe(1);
    });

    it("solo dentro de los 15 días, con talle, desde las 9 y con la regla activa", async () => {
      kids.children = [
        { ...olivia, childId: "lejos", birthday: "2021-10-30" }, // 16 días
        { ...olivia, childId: "hoy", birthday: "2021-10-14" }, // ya es el cumple
        { ...olivia, childId: "sin-talle", birthday: "2021-10-20", size: null },
        { ...olivia, childId: "tarde", name: "Emma", birthday: "2021-10-15", size: "12m" }, // se cargó tarde
      ];
      expect(await auto.birthdays()).toBe(1);
      expect(messenger.sent[0]).toMatchObject({ eyebrow: "Mañana cumple Emma" });
      expect(messenger.sent[0]?.body).toContain("talle 12 m");

      kids.children = [olivia];
      now = new Date("2026-10-14T08:00:00-03:00");
      expect(await auto.birthdays()).toBe(0); // de madrugada no
      expect(await auto.birthdays({ anyHour: true })).toBe(1); // recién cargada en "Mis nenas": en el momento
      now = new Date("2026-10-14T12:00:00-03:00");
      await auto.update("cumple", { on: false });
      expect(await auto.birthdays()).toBe(0);
    });
  });

  describe("bolsa abandonada", () => {
    const item = (name: string, size: string) => ({
      name,
      size,
      priceCents: 3_200_000,
      imageUrl: "http://api/media/x.webp",
      url: "http://web/producto/x",
    });
    const bag = (over: Partial<IdleCart> = {}) => ({
      cartId: "k1",
      updatedAt: new Date(now.getTime() - 25 * 3_600_000),
      firstName: "Lucía",
      lastName: "Fernández",
      email: "Lucia@Gmail.com",
      items: [
        item("Vestido Samanta", "6"),
        item("Set Maddie", "12m"),
        item("Moño", "Único"),
        item("Vestido Elsa", "6"),
      ],
      ...over,
    });

    it("a las 24 h sin tocarla: mail con las fotos (hasta 3) y el link a la bolsa, una vez", async () => {
      carts.list = [bag()];
      expect(await auto.idleCarts()).toBe(1);
      expect(await auto.idleCarts()).toBe(0);
      expect(messenger.sent).toEqual([
        {
          kind: "mensaje",
          to: "Lucia@Gmail.com",
          subject: "Te quedaron prendas en la bolsa ♡",
          eyebrow: "Tu bolsa te espera",
          body: "Hola Lucía! Te quedaron prendas en la bolsa. Todavía hay stock en tu talle: http://web/ingresar?volver=%2Fcheckout",
          products: expect.any(Array),
        },
      ]);
      expect(messenger.sent[0]?.products?.map((p) => p.name)).toEqual([
        "Vestido Samanta · talle 6",
        "Set Maddie · talle 12 m",
        "Moño",
      ]);
      expect(runs.list[0]).toMatchObject({
        rule: "bolsa_abandonada",
        subject: "Lucía Fernández",
        detail: "Recordatorio de 4 prendas por mail a Lucia@Gmail.com",
        contact: "lucia@gmail.com",
      });
      // si la vuelve a tocar y la deja otra vez, sale otro recordatorio
      carts.list = [bag({ updatedAt: new Date(now.getTime() - 30 * 3_600_000) })];
      expect(await auto.idleCarts()).toBe(1);
    });

    it("no antes de las 24 h, ni después de 7 días, ni vacía, ni de noche, ni con la regla pausada", async () => {
      carts.list = [
        bag({ cartId: "reciente", updatedAt: new Date(now.getTime() - 23 * 3_600_000) }),
        bag({ cartId: "vieja", updatedAt: new Date(now.getTime() - 8 * DAY) }),
        bag({ cartId: "agotada", items: [] }),
      ];
      expect(await auto.idleCarts()).toBe(0);
      carts.list = [bag()];
      now = new Date("2026-10-14T22:00:00-03:00");
      expect(await auto.idleCarts()).toBe(0);
      now = new Date("2026-10-14T08:00:00-03:00");
      carts.list = [bag()];
      expect(await auto.idleCarts()).toBe(0);
      now = new Date("2026-10-14T12:00:00-03:00");
      await auto.update("bolsa_abandonada", { on: false });
      expect(await auto.idleCarts()).toBe(0);
      expect(messenger.sent).toEqual([]);
    });
  });

  describe("aviso de lanzamiento", () => {
    const prenda = (n: number) => ({
      name: `Vestido ${n}`,
      priceCents: 4_500_000,
      imageUrl: `http://media/${n}.webp`,
      url: `http://web/producto/vestido-${n}`,
    });
    const anotar = (id: string, channel: "email" | "whatsapp", contact: string, launchId = "l1") =>
      launches.signups.push({ id, launchId, channel, contact, notifiedAt: null });

    beforeEach(() => {
      // sale a las 19 (Argentina): son las 18:10
      now = new Date("2026-10-20T18:10:00-03:00");
      launches.launches.push({
        id: "l1",
        title: "Otoño en el taller",
        startsAt: new Date("2026-10-20T19:00:00-03:00"),
        products: [1, 2, 3, 4].map(prenda),
      });
      anotar("s1", "email", "Ana@gmail.com");
      anotar("s2", "email", "bea@gmail.com");
      anotar("s3", "whatsapp", "+5491155550000");
    });

    it("falta una hora: mail a cada anotado con la hora y 3 prendas, una sola vez; WhatsApp queda esperando", async () => {
      expect(await auto.launchNotices()).toBe(2);
      expect(messenger.sent.map((m) => m.to)).toEqual(["Ana@gmail.com", "bea@gmail.com"]);
      expect(messenger.sent[0]).toMatchObject({
        subject: "Otoño en el taller sale hoy a las 19 h ♡",
        body: "Hola! Otoño en el taller sale hoy a las 19 h, antes que en Instagram. Mirá el adelanto: http://web/#lanzamiento",
      });
      expect(messenger.sent[0]?.products?.map((p) => p.name)).toEqual(["Vestido 1", "Vestido 2", "Vestido 3"]);
      expect(runs.list.filter((r) => r.channel === "mail").map((r) => r.contact)).toEqual([
        "ana@gmail.com",
        "bea@gmail.com",
      ]);
      expect(runs.list.find((r) => r.channel === "whatsapp")).toMatchObject({
        status: "warn",
        detail: "1 anotado por WhatsApp sin avisar: WhatsApp todavía no está conectado",
      });

      // el próximo minuto no repite nada; quien se anota después sí recibe el suyo
      now = new Date(now.getTime() + 60_000);
      anotar("s4", "email", "caro@gmail.com");
      expect(await auto.launchNotices()).toBe(1);
      expect(messenger.sent.map((m) => m.to)).toEqual(["Ana@gmail.com", "bea@gmail.com", "caro@gmail.com"]);
      expect(runs.list.filter((r) => r.channel === "whatsapp")).toHaveLength(1);
    });

    it("no antes de la hora previa, ni después de salir, ni con la regla pausada; el mensaje se puede editar", async () => {
      now = new Date("2026-10-20T17:59:00-03:00");
      expect(await auto.launchNotices()).toBe(0);
      now = new Date("2026-10-20T19:01:00-03:00");
      expect(await auto.launchNotices()).toBe(0);

      now = new Date("2026-10-20T18:30:00-03:00");
      await auto.update("lanzamiento", { on: false });
      expect(await auto.launchNotices()).toBe(0);
      expect(messenger.sent).toEqual([]);

      await auto.update("lanzamiento", { on: true, message: "{lanzamiento} a las {hora} ♡" });
      expect(await auto.launchNotices()).toBe(2);
      expect(messenger.sent[0]?.body).toBe("Otoño en el taller a las 19 h ♡");
    });
  });
});

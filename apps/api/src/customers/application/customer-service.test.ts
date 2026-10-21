import { AddressInputSchema, DEFAULT_POLICIES } from "@mini-galu/contracts";
import { beforeEach, describe, expect, it } from "vitest";
import { NotFoundError } from "../../shared/domain/errors";
import { MemoryCustomerOrders, MemoryCustomers, MemoryNewsletterPort } from "../testing/in-memory";
import { CustomerService } from "./customer-service";

let repo: MemoryCustomers;
let orders: MemoryCustomerOrders;
let newsletter: MemoryNewsletterPort;
let svc: CustomerService;

beforeEach(() => {
  repo = new MemoryCustomers();
  orders = new MemoryCustomerOrders();
  newsletter = new MemoryNewsletterPort();
  svc = new CustomerService(repo, orders, newsletter);
  repo.profiles.set("u1", {
    id: "u1",
    firstName: "Lucía",
    lastName: "Fernández",
    email: "lucia@gmail.com",
    emailVerified: true,
    phone: null,
    newsletterOptIn: false,
    createdAt: "2026-05-01T00:00:00Z",
  });
});

const addr = (over: object = {}) =>
  AddressInputSchema.parse({
    street: "Gurruchaga",
    number: "1234",
    city: "CABA",
    province: "CABA",
    postalCode: "1414",
    ...over,
  });

describe("mi cuenta", () => {
  it("pedidos por cuenta y por el mismo mail (los hechos sin ingresar también aparecen)", async () => {
    const o = { status: "nuevo", createdAt: "", totalCents: 1, items: [], reviewPath: null };
    orders.list.push(
      { ...o, number: "MG-1", userId: "u1", email: "otro@x.co" },
      { ...o, number: "MG-2", userId: null, email: "lucia@gmail.com" },
      { ...o, number: "MG-3", userId: null, email: "ana@gmail.com" },
    );
    expect((await svc.overview("u1")).orders.map((x) => x.number)).toEqual(["MG-1", "MG-2"]);
  });

  it("sin el mail confirmado no aparece nada de ese mail: ni pedidos sin ingresar ni gift cards", async () => {
    const card = { code: "GALU-AAAA-BBBB", amountCents: 1, balanceCents: 1, toName: "Ema", status: "activa" as const };
    const gifts = { forEmail: async () => [{ ...card, expiresAt: null, mine: "recibi" as const }] };
    const svc2 = new CustomerService(repo, orders, newsletter, gifts);
    const o = { status: "nuevo", createdAt: "", totalCents: 1, items: [], reviewPath: null };
    orders.list.push(
      { ...o, number: "MG-1", userId: "u1", email: "otro@x.co" },
      { ...o, number: "MG-2", userId: null, email: "lucia@gmail.com" },
    );
    expect((await svc2.overview("u1")).giftcards).toHaveLength(1);
    const p = repo.profiles.get("u1");
    if (p) repo.profiles.set("u1", { ...p, emailVerified: false });
    const view = await svc2.overview("u1");
    expect(view.orders.map((x) => x.number)).toEqual(["MG-1"]);
    expect(view.giftcards).toEqual([]);
  });

  it("puntos: los del mail de la cuenta, y canjearlos solo con el mail confirmado", async () => {
    const summary = { rules: DEFAULT_POLICIES.reviewPoints, balance: 100, coupons: [] };
    const redeemed: string[] = [];
    const points = {
      forEmail: async () => summary,
      redeem: async (email: string) => {
        redeemed.push(email);
        return { ...summary, balance: 0 };
      },
    };
    const svc2 = new CustomerService(repo, orders, newsletter, undefined, undefined, undefined, undefined, points);
    expect((await svc2.overview("u1")).points?.balance).toBe(100);
    expect((await svc2.redeemPoints("u1")).balance).toBe(0);
    expect(redeemed).toEqual(["lucia@gmail.com"]);
    const p = repo.profiles.get("u1");
    if (p) repo.profiles.set("u1", { ...p, emailVerified: false });
    expect((await svc2.overview("u1")).points).toBeNull();
    await expect(svc2.redeemPoints("u1")).rejects.toThrow("Confirmá tu email");
  });

  it("el tilde de las cartas suscribe y da de baja", async () => {
    await svc.updateProfile("u1", { firstName: "Lucía", lastName: "F", phone: null, newsletterOptIn: true });
    expect(newsletter.subscribed.has("lucia@gmail.com")).toBe(true);
    await svc.updateProfile("u1", { firstName: "Lucía", lastName: "F", phone: null, newsletterOptIn: false });
    expect(newsletter.subscribed.size).toBe(0);
  });

  it("la primera dirección queda predeterminada y solo hay una predeterminada", async () => {
    const a = await svc.addAddress("u1", addr());
    expect(a.isDefault).toBe(true);
    await svc.addAddress("u1", addr({ label: "Abuela", isDefault: true }));
    const list = (await svc.overview("u1")).addresses;
    expect(list.filter((x) => x.isDefault).map((x) => x.label)).toEqual(["Abuela"]);
    await expect(svc.updateAddress("u2", a.id, addr())).rejects.toBeInstanceOf(NotFoundError); // de otra cuenta
  });

  it("nenas y favoritos (los del navegador se suman al ingresar)", async () => {
    const k = await svc.addChild("u1", { name: "Olivia", birthday: "2021-11-14", size: "4", heightCm: null });
    await svc.updateChild("u1", k.id, { name: "Olivia", birthday: "2021-11-14", size: "6", heightCm: 112 });
    expect((await svc.overview("u1")).children[0]).toMatchObject({ size: "6", heightCm: 112 });
    await expect(svc.deleteChild("u2", k.id)).rejects.toBeInstanceOf(NotFoundError);
    expect(await svc.mergeFavorites("u1", ["maddie", "no-existe"])).toEqual(["maddie"]);
    expect(await svc.setFavorite("u1", "elsa", true)).toEqual(["maddie", "elsa"]);
    await expect(svc.setFavorite("u1", "no-existe", true)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("al cargar o cambiar el cumple de una nena avisa a las automatizaciones", async () => {
    const published: string[] = [];
    const events = { publish: async (e: { type: string }) => void published.push(e.type) };
    const svc3 = new CustomerService(repo, orders, newsletter, undefined, undefined, undefined, events);
    const k = await svc3.addChild("u1", { name: "Emma", birthday: null, size: "4", heightCm: null });
    expect(published).toEqual([]); // sin cumple no hay nada que avisar
    await svc3.updateChild("u1", k?.id ?? "", { name: "Emma", birthday: "2022-03-02", size: "4", heightCm: null });
    expect(published).toEqual(["ChildSaved"]);
  });
});

describe("lista de cumple", () => {
  it("se arma por nena, se comparte por link y lo regalado se marca al pagar (quién, después del cumple)", async () => {
    let now = new Date(2026, 9, 14);
    const svc2 = new CustomerService(
      repo,
      orders,
      newsletter,
      undefined,
      () => now,
      () => "7k2q",
    );
    const k = await svc2.addChild("u1", { name: "Olivia", birthday: "2021-11-14", size: "6", heightCm: null });
    expect(k?.wishSlug).toBe("olivia-7k2q");
    await svc2.addWish("u1", k?.id ?? "", "maddie", "6");
    await svc2.addWish("u1", k?.id ?? "", "maddie", "6"); // no se repite
    await expect(svc2.addWish("u2", k?.id ?? "", "elsa", "6")).rejects.toBeInstanceOf(NotFoundError); // otra cuenta
    const list = await svc2.publicList("olivia-7k2q");
    expect(list).toMatchObject({ name: "Olivia", items: [{ slug: "maddie", size: "6", gifted: false }] });

    orders.gifts.set("o1", { itemIds: [list.items[0]?.id ?? ""], firstName: "Marta" });
    expect(await svc2.wishGifted("o1")).toBe(1);
    expect(await svc2.wishGifted("o1")).toBe(0); // idempotente
    expect((await svc2.publicList("olivia-7k2q")).items[0]).toMatchObject({ gifted: true });
    expect((await svc2.overview("u1")).children[0]?.wishlist[0]).toMatchObject({ gifted: true, giftedBy: null });
    now = new Date(2026, 10, 15); // pasó el cumple
    expect((await svc2.overview("u1")).children[0]?.wishlist[0]?.giftedBy).toBe("Marta");
    await expect(svc2.publicList("no-existe")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("desde el catálogo se suman varias de una vez, sin repetir las que ya estaban", async () => {
    const k = await svc.addChild("u1", { name: "Emma", birthday: null, size: "4", heightCm: null });
    const id = k?.id ?? "";
    await svc.addWish("u1", id, "maddie", "4");
    const after = await svc.addWishes("u1", id, [
      { slug: "maddie", size: "4" },
      { slug: "elsa", size: "4" },
    ]);
    expect(after?.wishlist.map((w) => w.slug)).toEqual(["maddie", "elsa"]);
    await expect(svc.addWishes("u2", id, [{ slug: "elsa", size: "4" }])).rejects.toBeInstanceOf(NotFoundError);
    await expect(svc.addWishes("u1", id, [{ slug: "no-existe", size: "4" }])).rejects.toBeInstanceOf(NotFoundError);
  });
});

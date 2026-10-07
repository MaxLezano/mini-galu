import { beforeEach, describe, expect, it } from "vitest";
import { ConflictError, NotFoundError } from "../../shared/domain/errors";
import type { ImageStorage } from "../../shared/media/image-storage";
import { MemoryCarts, MemoryVariants, variant } from "../testing/in-memory";
import { CartService } from "./cart-service";

const storage: ImageStorage = { url: (p) => `http://api/media/${p}`, save: async (p) => p };
const guest = { token: "t1" };

let carts: MemoryCarts;
let variants: MemoryVariants;
let cart: CartService;

beforeEach(() => {
  carts = new MemoryCarts();
  variants = new MemoryVariants([
    variant("maddie", "4", 2),
    variant("maddie", "6", 1),
    variant("elsa", "2", 3),
    variant("borrador", "2", 5, { published: false }),
  ]);
  cart = new CartService(carts, variants, storage);
});

describe("CartService", () => {
  it("sin bolsa devuelve vacía y no crea nada", async () => {
    expect(await cart.view(guest)).toEqual({ lines: [], subtotalCents: 0, count: 0 });
    expect(carts.carts.size).toBe(0);
  });

  it("suma unidades hasta el stock del talle", async () => {
    await cart.add(guest, { slug: "maddie", size: "4", qty: 1 });
    const v = await cart.add(guest, { slug: "maddie", size: "4", qty: 1 });
    expect(v.count).toBe(2);
    expect(v.subtotalCents).toBe(76_000_00);
    expect(v.lines[0]).toMatchObject({
      slug: "maddie",
      size: "4",
      maxStock: 2,
      imageUrl: expect.stringContaining("http"),
    });
    await expect(cart.add(guest, { slug: "maddie", size: "4", qty: 1 })).rejects.toBeInstanceOf(ConflictError);
  });

  it("no deja agregar prendas en borrador", async () => {
    await expect(cart.add(guest, { slug: "borrador", size: "2", qty: 1 })).rejects.toBeInstanceOf(NotFoundError);
  });

  it("cantidad 0 saca el talle", async () => {
    await cart.add(guest, { slug: "elsa", size: "2", qty: 2 });
    expect((await cart.set(guest, { slug: "elsa", size: "2", qty: 0 })).count).toBe(0);
  });

  it("si se agota o baja el stock, la bolsa se ajusta sola", async () => {
    await cart.add(guest, { slug: "maddie", size: "4", qty: 2 });
    await cart.add(guest, { slug: "maddie", size: "6", qty: 1 });
    variants.setStock("maddie-4", 1);
    variants.setStock("maddie-6", 0);
    const v = await cart.view(guest);
    expect(v.lines.map((l) => [l.size, l.qty])).toEqual([["4", 1]]);
  });

  it("merge suma la bolsa del navegador sin pasarse del stock e ignora lo que no existe", async () => {
    await cart.add(guest, { slug: "maddie", size: "4", qty: 1 });
    const v = await cart.merge(guest, [
      { slug: "maddie", size: "4", qty: 5 },
      { slug: "elsa", size: "2", qty: 1 },
      { slug: "no-existe", size: "2", qty: 1 },
      { slug: "borrador", size: "2", qty: 1 },
    ]);
    expect(v.lines.map((l) => [l.slug, l.qty])).toEqual([
      ["maddie", 2],
      ["elsa", 1],
    ]);
  });

  it("al ingresar, la bolsa de invitada pasa a la cuenta", async () => {
    await cart.add(guest, { slug: "elsa", size: "2", qty: 2 });
    await cart.add({ userId: "u1" }, { slug: "elsa", size: "2", qty: 2 });
    await cart.adopt("t1", "u1");
    expect((await cart.view({ userId: "u1" })).count).toBe(3);
    expect(await carts.findId(guest)).toBeNull();
  });
});

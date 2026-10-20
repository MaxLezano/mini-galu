import { ReviewInputSchema } from "@mini-galu/contracts";
import { beforeEach, describe, expect, it } from "vitest";
import { deliveredOrder, FakeResizer, MemoryReviews, MemoryStorage } from "../testing/in-memory";
import { ReviewService } from "./review-service";

const input = (over = {}) =>
  ReviewInputSchema.parse({ rating: 5, body: "Le quedó divino, la tela es hermosa", ...over });
const jpg = { type: "image/jpeg", bytes: new Uint8Array([0xff, 0xd8, 1, 2]) };

describe("ReviewService", () => {
  let repo: MemoryReviews;
  let storage: MemoryStorage;
  let svc: ReviewService;
  beforeEach(() => {
    repo = new MemoryReviews();
    repo.orders.push(deliveredOrder());
    storage = new MemoryStorage();
    svc = new ReviewService(repo, storage, new FakeResizer());
  });

  it("muestra las prendas del pedido con el token del pedido; con otro token, 404", async () => {
    const o = await svc.forOrder("MG-1035", "tok");
    expect(o).toMatchObject({ number: "MG-1035", firstName: "Lucía", author: "Lucía F.", delivered: true });
    expect(o.items.map((i) => [i.name, i.review])).toEqual([
      ["Vestido Maddie", null],
      ["Moño verde", null],
    ]);
    await expect(svc.forOrder("MG-1035", "otro")).rejects.toThrow("No encontramos ese pedido");
    await expect(svc.forOrder("MG-9999", "tok")).rejects.toThrow("No encontramos ese pedido");
  });

  it("guarda la reseña pendiente, con nombre y apellido corto, ciudad y talle del pedido", async () => {
    const it1 = await svc.submit("MG-1035", "tok", "i1", input({ fit: "justo" }), jpg);
    expect(it1.review).toMatchObject({ rating: 5, published: false });
    expect(it1.review?.photoUrl).toMatch(/^http:\/\/media\/reviews\/.+\.webp$/);
    expect(repo.rows[0]).toMatchObject({
      productId: "p1",
      author: "Lucía F.",
      city: "Rosario",
      size: "6",
      fit: "justo",
      status: "pendiente",
      featured: false,
    });
  });

  it("una reseña por prenda", async () => {
    await svc.submit("MG-1035", "tok", "i1", input(), null);
    await expect(svc.submit("MG-1035", "tok", "i1", input(), null)).rejects.toThrow("Ya dejaste la reseña");
    expect(repo.rows).toHaveLength(1);
    expect(storage.saved).toEqual([]);
  });

  it("solo con el pedido entregado y prendas del pedido", async () => {
    repo.orders[0] = deliveredOrder({ status: "en_camino" });
    expect((await svc.forOrder("MG-1035", "tok")).delivered).toBe(false);
    await expect(svc.submit("MG-1035", "tok", "i1", input(), null)).rejects.toThrow("cuando te llegue");
    repo.orders[0] = deliveredOrder();
    await expect(svc.submit("MG-1035", "tok", "otra", input(), null)).rejects.toThrow("no está en el pedido");
  });

  it("rechaza lo que no es una foto sin guardar nada", async () => {
    await expect(
      svc.submit("MG-1035", "tok", "i1", input(), { type: "application/pdf", bytes: jpg.bytes }),
    ).rejects.toThrow("JPG, PNG");
    await expect(
      svc.submit("MG-1035", "tok", "i1", input(), { type: "image/png", bytes: new Uint8Array([1, 2, 3]) }),
    ).rejects.toThrow("No pudimos abrir la foto");
    expect(repo.rows).toEqual([]);
  });

  it("Gaby publica, destaca para la home y, si la oculta, sale de la home", async () => {
    await svc.submit("MG-1035", "tok", "i1", input(), null);
    const id = repo.rows[0]?.id as string;
    await expect(svc.moderate(id, { featured: true })).rejects.toThrow("primero publicala");
    expect(await svc.moderate(id, { status: "publicada", featured: true })).toMatchObject({
      status: "publicada",
      featured: true,
      orderNumber: "MG-1035",
    });
    expect((await svc.forOrder("MG-1035", "tok")).items[0]?.review?.published).toBe(true);
    expect(await svc.moderate(id, { status: "oculta" })).toMatchObject({ status: "oculta", featured: false });
    await expect(svc.moderate("nada", { status: "oculta" })).rejects.toThrow("No existe");
  });
});

describe("ReviewInputSchema", () => {
  it("pide estrellas y un texto de al menos 10 letras", () => {
    expect(ReviewInputSchema.safeParse({ rating: 0, body: "Divino!!!!!" }).success).toBe(false);
    expect(ReviewInputSchema.safeParse({ rating: 4, body: "corto" }).success).toBe(false);
    // llega de un form (multipart): las estrellas vienen como texto
    expect(ReviewInputSchema.parse({ rating: "4", body: "  Le quedó divino  " })).toEqual({
      rating: 4,
      body: "Le quedó divino",
      fit: null,
    });
  });
});

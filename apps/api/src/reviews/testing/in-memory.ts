import type { ImageStorage } from "../../shared/media/image-storage";
import type { ImageResizer } from "../../shared/media/responsive-image-storage";
import type { NewReview, ReviewOrder, ReviewRepository, ReviewRow } from "../application/ports";
import type { Moderated } from "../domain/review";

export class MemoryReviews implements ReviewRepository {
  orders: ReviewOrder[] = [];
  rows: (ReviewRow & { orderItemId: string | null })[] = [];
  private seq = 0;

  async findOrder(number: string) {
    return this.orders.find((o) => o.number === number) ?? null;
  }
  async ofItems(ids: string[]) {
    return this.rows
      .filter((r) => r.orderItemId && ids.includes(r.orderItemId))
      .map((r) => ({
        orderItemId: r.orderItemId as string,
        rating: r.rating,
        body: r.body,
        photoPath: r.photoPath,
        status: r.status,
      }));
  }
  async add(r: NewReview) {
    if (this.rows.some((x) => x.orderItemId === r.orderItemId)) return false;
    const o = this.orders.find((x) => x.items.some((i) => i.id === r.orderItemId));
    const it = o?.items.find((i) => i.id === r.orderItemId);
    this.rows.unshift({
      ...r,
      id: `rv-${++this.seq}`,
      title: "",
      status: "pendiente",
      featured: false,
      product: { slug: it?.slug ?? "", name: it?.name ?? "", imagePath: it?.imagePath ?? null },
      orderNumber: o?.number ?? null,
      createdAt: new Date(),
    });
    return true;
  }
  async list() {
    return this.rows;
  }
  async find(id: string) {
    return this.rows.find((r) => r.id === id) ?? null;
  }
  async update(id: string, v: Moderated) {
    const r = this.rows.find((x) => x.id === id);
    if (r) Object.assign(r, v);
  }
}

/** Guarda en memoria y devuelve la ruta tal cual. */
export class MemoryStorage implements ImageStorage {
  saved: string[] = [];
  url(path: string) {
    return `http://media/${path}`;
  }
  async save(path: string) {
    this.saved.push(path);
    return path;
  }
}

/** "Codifica" solo lo que empieza con los bytes de una foto (FF D8 de un JPG); lo demás falla como sharp. */
export class FakeResizer implements ImageResizer {
  async resize(bytes: Uint8Array) {
    if (bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error("Input buffer contains unsupported image format");
    return bytes;
  }
}

export const deliveredOrder = (over: Partial<ReviewOrder> = {}): ReviewOrder => ({
  id: "o1",
  number: "MG-1035",
  accessToken: "tok",
  status: "entregado",
  firstName: "Lucía",
  lastName: "Fernández",
  email: "lucia@gmail.com",
  city: "Rosario",
  items: [
    { id: "i1", productId: "p1", slug: "maddie", name: "Vestido Maddie", size: "6", imagePath: "products/maddie.webp" },
    { id: "i2", productId: "p2", slug: "mono-verde", name: "Moño verde", size: "Único", imagePath: null },
  ],
  ...over,
});

import type {
  AccountAddress,
  AccountOrder,
  AccountProfile,
  AdminCustomerOrder,
  ChildInput,
} from "@mini-galu/contracts";
import type {
  AddressData,
  AdminCustomerRepository,
  ChildRecord,
  CustomerOrders,
  CustomerRepository,
  NewsletterPort,
  WishItemRecord,
} from "../application/ports";
import type { CustomerAccountFact, CustomerOrderFact } from "../domain/customer-list";

export class MemoryCustomers implements CustomerRepository {
  profiles = new Map<string, AccountProfile>();
  kids: (ChildRecord & { userId: string })[] = [];
  wishes: WishItemRecord[] = [];
  addrs: (AccountAddress & { userId: string })[] = [];
  favs = new Map<string, Set<string>>();
  /** Prendas que existen (para los favoritos). */
  products = new Set<string>(["maddie", "elsa"]);
  private seq = 0;

  async profile(id: string) {
    return this.profiles.get(id) ?? null;
  }
  async updateProfile(id: string, p: Partial<AccountProfile>) {
    const cur = this.profiles.get(id);
    if (cur) this.profiles.set(id, { ...cur, ...p });
  }
  async children(userId: string) {
    return this.kids.filter((k) => k.userId === userId).map(({ userId: _u, ...k }) => k);
  }
  async child(userId: string, id: string) {
    const k = this.kids.find((x) => x.id === id && x.userId === userId);
    if (!k) return null;
    const { userId: _u, ...out } = k;
    return out;
  }
  async addChild(userId: string, c: ChildInput, wishSlug: string) {
    const k = { ...c, id: `c${++this.seq}`, userId, wishSlug };
    this.kids.push(k);
    const { userId: _u, ...out } = k;
    return out;
  }
  async updateChild(userId: string, id: string, c: ChildInput) {
    const k = this.kids.find((x) => x.id === id && x.userId === userId);
    if (!k) return null;
    Object.assign(k, c);
    const { userId: _u, ...out } = k;
    return out;
  }
  async deleteChild(userId: string, id: string) {
    const before = this.kids.length;
    this.kids = this.kids.filter((x) => !(x.id === id && x.userId === userId));
    return this.kids.length < before;
  }
  async wishItems(childIds: string[]) {
    return this.wishes.filter((w) => childIds.includes(w.childId));
  }
  async addWish(childId: string, slug: string, size: string) {
    if (!this.products.has(slug)) return false;
    if (this.wishes.some((w) => w.childId === childId && w.slug === slug && w.size === size)) return true;
    this.wishes.push({
      id: `w${++this.seq}`,
      childId,
      slug,
      name: slug,
      size,
      priceCents: 1000,
      imageUrl: "",
      inStock: true,
      giftedBy: null,
      giftedAt: null,
    });
    return true;
  }
  async removeWish(childId: string, itemId: string) {
    const before = this.wishes.length;
    this.wishes = this.wishes.filter((w) => !(w.childId === childId && w.id === itemId));
    return this.wishes.length < before;
  }
  async childBySlug(slug: string) {
    const k = this.kids.find((x) => x.wishSlug === slug);
    if (!k) return null;
    const { userId: _u, ...out } = k;
    return out;
  }
  async markGifted(itemIds: string[], by: string, at: Date) {
    let n = 0;
    for (const w of this.wishes)
      if (itemIds.includes(w.id) && !w.giftedAt) {
        w.giftedAt = at;
        w.giftedBy = by;
        n++;
      }
    return n;
  }
  async addresses(userId: string) {
    return this.addrs.filter((a) => a.userId === userId).map(({ userId: _u, ...a }) => a);
  }
  async addAddress(userId: string, a: AddressData) {
    if (a.isDefault) for (const x of this.addrs) if (x.userId === userId) x.isDefault = false;
    const row = {
      id: `a${++this.seq}`,
      userId,
      label: a.label,
      street: a.street,
      number: a.number,
      unit: a.unit,
      city: a.city,
      province: a.province,
      postalCode: a.postalCode,
      notes: a.notes,
      isDefault: a.isDefault,
    };
    this.addrs.push(row);
    const { userId: _u, ...out } = row;
    return out;
  }
  async updateAddress(userId: string, id: string, a: AddressData) {
    const x = this.addrs.find((r) => r.id === id && r.userId === userId);
    if (!x) return null;
    if (a.isDefault) for (const r of this.addrs) if (r.userId === userId) r.isDefault = false;
    Object.assign(x, { ...a });
    const { userId: _u, ...out } = x;
    return out as AccountAddress;
  }
  async deleteAddress(userId: string, id: string) {
    const before = this.addrs.length;
    this.addrs = this.addrs.filter((x) => !(x.id === id && x.userId === userId));
    return this.addrs.length < before;
  }
  async favorites(userId: string) {
    return [...(this.favs.get(userId) ?? [])];
  }
  async setFavorite(userId: string, slug: string, on: boolean) {
    if (!this.products.has(slug)) return false;
    const s = this.favs.get(userId) ?? new Set<string>();
    if (on) s.add(slug);
    else s.delete(slug);
    this.favs.set(userId, s);
    return true;
  }
}

export class MemoryCustomerOrders implements CustomerOrders {
  list: (AccountOrder & { userId: string | null; email: string })[] = [];
  gifts = new Map<string, { itemIds: string[]; firstName: string }>();
  async wishGift(orderId: string) {
    return this.gifts.get(orderId) ?? null;
  }
  async ofCustomer(userId: string, email: string | null) {
    return this.list
      .filter((o) => o.userId === userId || (email !== null && o.email === email))
      .map(({ userId: _u, email: _e, ...o }) => o);
  }
}

export class MemoryNewsletterPort implements NewsletterPort {
  subscribed = new Set<string>();
  async subscribe(email: string) {
    this.subscribed.add(email);
  }
  async unsubscribeEmail(email: string) {
    this.subscribed.delete(email);
  }
}

/** Clientes del panel en memoria: los hechos se cargan a mano en cada test. */
export class MemoryAdminCustomers implements AdminCustomerRepository {
  orders: CustomerOrderFact[] = [];
  accounts: CustomerAccountFact[] = [];
  orderLists = new Map<string, AdminCustomerOrder[]>();
  collections = new Map<string, string[]>();
  notes = new Map<string, string>();
  async orderFacts() {
    return this.orders;
  }
  async accountFacts() {
    return this.accounts;
  }
  async ordersOf(email: string) {
    return this.orderLists.get(email) ?? [];
  }
  async collectionsOf(email: string) {
    return this.collections.get(email) ?? [];
  }
  async note(email: string) {
    return this.notes.get(email) ?? "";
  }
  async setNote(email: string, note: string) {
    this.notes.set(email, note);
  }
}

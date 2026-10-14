import type { AccountAddress, AccountChild, AccountOrder, AccountProfile, ChildInput } from "@mini-galu/contracts";
import type { AddressData, CustomerOrders, CustomerRepository, NewsletterPort } from "../application/ports";

export class MemoryCustomers implements CustomerRepository {
  profiles = new Map<string, AccountProfile>();
  kids: (AccountChild & { userId: string })[] = [];
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
  async addChild(userId: string, c: ChildInput) {
    const k = { ...c, id: `c${++this.seq}`, userId };
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
  async ofCustomer(userId: string, email: string) {
    return this.list
      .filter((o) => o.userId === userId || o.email === email)
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

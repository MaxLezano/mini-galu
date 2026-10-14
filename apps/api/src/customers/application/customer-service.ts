import { randomBytes } from "node:crypto";
import type {
  AccountChild,
  AccountOverview,
  AddressInputSchema,
  ChildInput,
  ProfileUpdate,
  PublicWishlist,
} from "@mini-galu/contracts";
import type { z } from "zod";
import { NotFoundError } from "../../shared/domain/errors";
import { revealGiver, wishSlug } from "../domain/wishlist";
import type { ChildRecord, CustomerOrders, CustomerRepository, GiftcardsPort, NewsletterPort } from "./ports";

type AddressData = z.output<typeof AddressInputSchema>;

/** "Mi cuenta" (cuenta.html): datos, nenas y su lista de cumple, direcciones, pedidos y favoritos. */
export class CustomerService {
  constructor(
    private readonly repo: CustomerRepository,
    private readonly orders: CustomerOrders,
    private readonly newsletter: NewsletterPort,
    private readonly giftcards: GiftcardsPort = { forEmail: async () => [] },
    private readonly clock: () => Date = () => new Date(),
    private readonly random: () => string = () => randomBytes(3).toString("hex").slice(0, 4),
  ) {}

  async overview(userId: string): Promise<AccountOverview> {
    const profile = await this.repo.profile(userId);
    if (!profile) throw new NotFoundError("No encontramos tu cuenta");
    const [children, addresses, orders, favorites, giftcards] = await Promise.all([
      this.childrenOf(userId),
      this.repo.addresses(userId),
      this.orders.ofCustomer(userId, profile.email),
      this.repo.favorites(userId),
      this.giftcards.forEmail(profile.email.toLowerCase()),
    ]);
    return { profile, children, addresses, orders, favorites, giftcards };
  }

  async updateProfile(userId: string, p: ProfileUpdate) {
    const before = await this.repo.profile(userId);
    if (!before) throw new NotFoundError("No encontramos tu cuenta");
    await this.repo.updateProfile(userId, p);
    if (p.newsletterOptIn !== before.newsletterOptIn)
      await (p.newsletterOptIn
        ? this.newsletter.subscribe(before.email, "cuenta")
        : this.newsletter.unsubscribeEmail(before.email));
    return this.repo.profile(userId);
  }

  /* ---------------------------------------------------------------- mis nenas */

  async addChild(userId: string, c: ChildInput) {
    const r = await this.repo.addChild(userId, c, wishSlug(c.name, this.random()));
    return this.one(r);
  }

  async updateChild(userId: string, id: string, c: ChildInput) {
    const r = await this.repo.updateChild(userId, id, c);
    if (!r) throw new NotFoundError("No encontramos a esa nena");
    return this.one(r);
  }

  async deleteChild(userId: string, id: string) {
    if (!(await this.repo.deleteChild(userId, id))) throw new NotFoundError("No encontramos a esa nena");
  }

  /* ---------------------------------------------------------------- lista de cumple */

  async addWish(userId: string, childId: string, slug: string, size: string) {
    const child = await this.ownChild(userId, childId);
    if (!(await this.repo.addWish(child.id, slug, size))) throw new NotFoundError("No existe esa prenda");
    return this.one(child);
  }

  async removeWish(userId: string, childId: string, itemId: string) {
    const child = await this.ownChild(userId, childId);
    if (!(await this.repo.removeWish(child.id, itemId))) throw new NotFoundError("Esa prenda ya no está en la lista");
    return this.one(child);
  }

  /** La lista que ve la familia desde el link (sin quién regaló qué). */
  async publicList(slug: string): Promise<PublicWishlist> {
    const child = await this.repo.childBySlug(slug);
    if (!child) throw new NotFoundError("No encontramos esa lista de cumple");
    const items = await this.repo.wishItems([child.id]);
    return {
      name: child.name,
      birthday: child.birthday,
      items: items.map(({ childId: _c, giftedBy: _b, giftedAt, ...i }) => ({ ...i, gifted: !!giftedAt })),
    };
  }

  /** Pago aprobado: las prendas de lista que venían en el pedido quedan regaladas (con el nombre de quien compró). */
  async wishGifted(orderId: string): Promise<number> {
    const g = await this.orders.wishGift(orderId);
    if (!g?.itemIds.length) return 0;
    return this.repo.markGifted(g.itemIds, g.firstName, this.clock());
  }

  /* ---------------------------------------------------------------- direcciones y favoritos */

  async addAddress(userId: string, a: AddressData) {
    // la primera dirección queda como predeterminada
    const first = (await this.repo.addresses(userId)).length === 0;
    return this.repo.addAddress(userId, { ...a, isDefault: a.isDefault || first });
  }

  async updateAddress(userId: string, id: string, a: AddressData) {
    const r = await this.repo.updateAddress(userId, id, a);
    if (!r) throw new NotFoundError("No encontramos esa dirección");
    return r;
  }

  async deleteAddress(userId: string, id: string) {
    if (!(await this.repo.deleteAddress(userId, id))) throw new NotFoundError("No encontramos esa dirección");
  }

  async setFavorite(userId: string, slug: string, on: boolean) {
    if (!(await this.repo.setFavorite(userId, slug, on))) throw new NotFoundError("No existe esa prenda");
    return this.repo.favorites(userId);
  }

  /** Al ingresar: los favoritos guardados en el navegador se suman a los de la cuenta. */
  async mergeFavorites(userId: string, slugs: string[]) {
    for (const s of slugs) await this.repo.setFavorite(userId, s, true);
    return this.repo.favorites(userId);
  }

  /* ---------------------------------------------------------------- ayudas */

  private async ownChild(userId: string, id: string): Promise<ChildRecord> {
    const c = await this.repo.child(userId, id);
    if (!c) throw new NotFoundError("No encontramos a esa nena");
    return c;
  }

  private async one(c: ChildRecord): Promise<AccountChild> {
    const [v] = await this.view([c]);
    if (!v) throw new NotFoundError("No encontramos a esa nena");
    return v;
  }

  private async childrenOf(userId: string) {
    return this.view(await this.repo.children(userId));
  }

  private async view(list: ChildRecord[]): Promise<AccountChild[]> {
    const items = await this.repo.wishItems(list.map((c) => c.id));
    const now = this.clock();
    return list.map((c) => ({
      ...c,
      wishlist: items
        .filter((i) => i.childId === c.id)
        .map(({ childId: _c, inStock: _s, giftedAt, giftedBy, ...i }) => ({
          ...i,
          gifted: !!giftedAt,
          giftedBy: giftedAt && revealGiver(c.birthday, giftedAt, now) ? giftedBy : null,
        })),
    }));
  }
}

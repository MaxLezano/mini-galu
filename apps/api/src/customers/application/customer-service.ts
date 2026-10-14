import type { AccountOverview, AddressInputSchema, ChildInput, ProfileUpdate } from "@mini-galu/contracts";
import type { z } from "zod";
import { NotFoundError } from "../../shared/domain/errors";
import type { CustomerOrders, CustomerRepository, NewsletterPort } from "./ports";

type AddressData = z.output<typeof AddressInputSchema>;

/** "Mi cuenta" (cuenta.html): datos, nenas, direcciones, pedidos y favoritos de quien ingresó. */
export class CustomerService {
  constructor(
    private readonly repo: CustomerRepository,
    private readonly orders: CustomerOrders,
    private readonly newsletter: NewsletterPort,
  ) {}

  async overview(userId: string): Promise<AccountOverview> {
    const profile = await this.repo.profile(userId);
    if (!profile) throw new NotFoundError("No encontramos tu cuenta");
    const [children, addresses, orders, favorites] = await Promise.all([
      this.repo.children(userId),
      this.repo.addresses(userId),
      this.orders.ofCustomer(userId, profile.email),
      this.repo.favorites(userId),
    ]);
    return { profile, children, addresses, orders, favorites };
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

  addChild(userId: string, c: ChildInput) {
    return this.repo.addChild(userId, c);
  }

  async updateChild(userId: string, id: string, c: ChildInput) {
    const r = await this.repo.updateChild(userId, id, c);
    if (!r) throw new NotFoundError("No encontramos a esa nena");
    return r;
  }

  async deleteChild(userId: string, id: string) {
    if (!(await this.repo.deleteChild(userId, id))) throw new NotFoundError("No encontramos a esa nena");
  }

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
}

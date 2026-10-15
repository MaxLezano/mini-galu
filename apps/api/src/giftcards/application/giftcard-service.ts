import type {
  AccountGiftcard,
  AdminGiftcards,
  GiftcardBalance,
  GiftcardCreated,
  GiftcardPurchaseSchema,
  GiftcardSummary,
} from "@mini-galu/contracts";
import { toE164AR } from "@mini-galu/contracts";
import type { z } from "zod";
import type { GiftcardCheck } from "../../orders/application/checkout-service";
import { NotFoundError } from "../../shared/domain/errors";
import { deliverAt, expiresAt, giftcardCode, normalizeCode, usable } from "../domain/giftcard";
import type { GiftcardMailer, GiftcardOrders, GiftcardRecord, GiftcardRepository } from "./ports";

type Purchase = z.output<typeof GiftcardPurchaseSchema>;

/**
 * Gift cards (giftcards.html): se compran como un pedido de tipo "giftcard" (mismo pago con Mercado Pago); al
 * pagarse se activan con un código, le llegan a quien la recibe el día elegido y se usan en el checkout.
 */
export class GiftcardService {
  constructor(
    private readonly cards: GiftcardRepository,
    private readonly orders: GiftcardOrders,
    private readonly mailer: GiftcardMailer,
    private readonly clock: () => Date = () => new Date(),
    private readonly random: () => Uint8Array = () => crypto.getRandomValues(new Uint8Array(8)),
  ) {}

  async buy(p: Purchase): Promise<GiftcardCreated> {
    const o = await this.orders.create({ buyer: p.buyer, amountCents: p.amountCents });
    // una fecha que ya pasó (o es hoy después de las 9) sale apenas se paga
    const at = deliverAt(p.deliverOn);
    await this.cards.create({
      orderId: o.orderId,
      amountCents: p.amountCents,
      design: p.design,
      toName: p.toName,
      fromName: p.fromName,
      message: p.message,
      via: p.via,
      recipient: p.via === "whatsapp" ? (toE164AR(p.recipient) ?? p.recipient) : p.recipient.toLowerCase(),
      deliverAt: at && at > this.clock() ? at : null,
    });
    return { number: o.number, accessToken: o.accessToken, totalCents: p.amountCents };
  }

  /** Para la página de pago y el comprobante. */
  async summary(orderId: string): Promise<GiftcardSummary | null> {
    const c = await this.cards.byOrder(orderId);
    if (!c) return null;
    return {
      design: c.design,
      amountCents: c.amountCents,
      toName: c.toName,
      fromName: c.fromName,
      message: c.message,
      via: c.via,
      deliverOn: c.deliverAt ? c.deliverAt.toISOString().slice(0, 10) : null,
    };
  }

  /**
   * Pago aprobado. Si el pedido era la compra de una gift card, se activa (y se manda si es para ahora); si era de
   * prendas pagado en parte con una gift card, se descuenta del saldo.
   */
  async paymentApproved(orderId: string): Promise<void> {
    const o = await this.orders.find(orderId);
    if (!o) return;
    if (o.kind === "prendas") {
      if (!o.giftcardId || o.giftcardCents <= 0) return;
      const r = await this.cards.redeem(o.giftcardId, orderId, o.giftcardCents);
      if (r === "sin_saldo")
        await this.orders.log(
          orderId,
          "La gift card ya no tenía saldo",
          "Se usó en otro pedido mientras se pagaba este: hay que cobrar la diferencia",
        );
      return;
    }
    const card = await this.cards.byOrder(orderId);
    if (card?.status !== "esperando_pago") return;
    const now = this.clock();
    const code = giftcardCode(this.random());
    const until = expiresAt(now);
    if (!(await this.cards.activate(card.id, code, until))) return;
    await this.orders.close(orderId);
    const active = { ...card, code, expiresAt: until, status: "activa" as const };
    await this.mailer.toBuyer(o.email, active).catch((e) => console.warn("[gift cards] mail a quien compró:", e));
    if (!card.deliverAt || card.deliverAt <= now) await this.deliver(active);
  }

  /* ---------------------------------------------------------------- reintegro de un pedido (RefundGiftcards) */

  async purchasedUsed(orderId: string): Promise<boolean> {
    const c = await this.cards.byOrder(orderId);
    return !!c && c.balanceCents < c.amountCents;
  }

  /** Se reintegra la compra de una gift card: deja de valer (solo si nadie la usó). */
  annulPurchased(orderId: string): Promise<boolean> {
    return this.cards.annulUnused(orderId);
  }

  reactivatePurchased(orderId: string): Promise<void> {
    return this.cards.reactivate(orderId);
  }

  /** Se reintegra un pedido pagado en parte con una gift card: lo que usó vuelve a su saldo. */
  restoreRedeemed(orderId: string): Promise<number> {
    return this.cards.restoreRedemption(orderId);
  }

  /** Las programadas para un día: salen a las 9. Lo corre el programador. */
  async deliverDue(): Promise<number> {
    const due = await this.cards.dueForDelivery(this.clock());
    for (const c of due) if (c.code && c.expiresAt) await this.deliver({ ...c, code: c.code, expiresAt: c.expiresAt });
    return due.length;
  }

  async balance(code: string): Promise<GiftcardBalance> {
    const c = await this.cards.byCode(normalizeCode(code));
    if (!c?.code || c.status !== "activa" || !c.expiresAt) throw new NotFoundError("No encontramos esa gift card");
    return {
      code: c.code,
      balanceCents: c.balanceCents,
      expiresAt: c.expiresAt.toISOString(),
      usable: usable(c, this.clock()) === null,
      toName: c.toName,
    };
  }

  /** Para el checkout: la tarjeta y su saldo, o por qué no sirve. */
  async check(code: string): Promise<GiftcardCheck> {
    return this.toCheck(await this.cards.byCode(normalizeCode(code)));
  }

  async checkById(id: string): Promise<GiftcardCheck> {
    return this.toCheck(await this.cards.byId(id));
  }

  private toCheck(c: GiftcardRecord | null): GiftcardCheck {
    if (!c?.code) return { error: "No encontramos esa gift card" };
    const why = usable(c, this.clock());
    return why ? { error: why } : { id: c.id, code: c.code, balanceCents: c.balanceCents };
  }

  /** Panel (admin-tienda.html): lo vendido, el saldo que falta usar (sin las vencidas) y cada tarjeta. */
  async admin(): Promise<AdminGiftcards> {
    const now = this.clock();
    const cards = (await this.cards.active()).flatMap((c) =>
      c.code && c.expiresAt
        ? [
            {
              code: c.code,
              toName: c.toName,
              fromName: c.fromName,
              amountCents: c.amountCents,
              balanceCents: c.balanceCents,
              expiresAt: c.expiresAt.toISOString(),
              expired: c.expiresAt < now,
            },
          ]
        : [],
    );
    return {
      sold: cards.length,
      soldCents: cards.reduce((a, c) => a + c.amountCents, 0),
      unusedCents: cards.reduce((a, c) => a + (c.expired ? 0 : c.balanceCents), 0),
      cards,
    };
  }

  forEmail(email: string): Promise<AccountGiftcard[]> {
    return this.cards.forEmail(email.toLowerCase());
  }

  private async deliver(c: GiftcardRecord & { code: string; expiresAt: Date }) {
    // por mail le llega a quien la recibe; por WhatsApp la manda quien la compró (con el botón de su mail)
    if (c.via === "mail")
      await this.mailer.toRecipient(c.recipient, c).catch((e) => console.warn("[gift cards] mail:", e));
    await this.cards.markDelivered(c.id, this.clock());
  }
}

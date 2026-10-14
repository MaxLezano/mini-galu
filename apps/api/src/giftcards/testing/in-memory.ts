import type { AccountGiftcard } from "@mini-galu/contracts";
import type { GiftcardMailer, GiftcardRecord, GiftcardRepository, NewGiftcard } from "../application/ports";

/** Gift cards en memoria. `buyers`: mail de quien compró cada una (en la base sale del pedido). */
export class MemoryGiftcards implements GiftcardRepository {
  list: GiftcardRecord[] = [];
  redemptions: { giftcardId: string; orderId: string; cents: number }[] = [];
  buyers = new Map<string, string>();
  private seq = 1;

  async create(g: NewGiftcard) {
    const card: GiftcardRecord = {
      ...g,
      id: `g${this.seq++}`,
      code: null,
      status: "esperando_pago",
      balanceCents: g.amountCents,
      deliveredAt: null,
      expiresAt: null,
    };
    this.list.push(card);
    return card;
  }
  async byOrder(orderId: string) {
    return this.list.find((c) => c.orderId === orderId) ?? null;
  }
  async byCode(code: string) {
    return this.list.find((c) => c.code === code) ?? null;
  }
  async byId(id: string) {
    return this.list.find((c) => c.id === id) ?? null;
  }
  async activate(id: string, code: string, expiresAt: Date) {
    const c = this.list.find((x) => x.id === id);
    if (c?.status !== "esperando_pago") return false;
    Object.assign(c, { status: "activa", code, expiresAt });
    return true;
  }
  async markDelivered(id: string, at: Date) {
    const c = this.list.find((x) => x.id === id);
    if (c) c.deliveredAt = at;
  }
  async dueForDelivery(now: Date) {
    return this.list.filter((c) => c.status === "activa" && !c.deliveredAt && c.deliverAt && c.deliverAt <= now);
  }
  async redeem(id: string, orderId: string, cents: number) {
    const c = this.list.find((x) => x.id === id);
    if (this.redemptions.some((r) => r.giftcardId === id && r.orderId === orderId)) return "repetido" as const;
    if (!c || c.balanceCents < cents) return "sin_saldo" as const;
    c.balanceCents -= cents;
    this.redemptions.push({ giftcardId: id, orderId, cents });
    return "ok" as const;
  }
  async forEmail(email: string): Promise<AccountGiftcard[]> {
    return this.list
      .filter((c) => this.buyers.get(c.orderId) === email || c.recipient === email)
      .map((c) => ({
        code: c.code,
        amountCents: c.amountCents,
        balanceCents: c.balanceCents,
        toName: c.toName,
        status: c.status,
        expiresAt: c.expiresAt?.toISOString() ?? null,
        mine: this.buyers.get(c.orderId) === email ? "compre" : "recibi",
      }));
  }
}

/** Anota los mails en vez de mandarlos. */
export class MemoryGiftcardMailer implements GiftcardMailer {
  sent: { to: string; kind: "recipient" | "buyer"; code: string }[] = [];
  async toRecipient(to: string, c: { code: string }) {
    this.sent.push({ to, kind: "recipient", code: c.code });
  }
  async toBuyer(to: string, c: { code: string }) {
    this.sent.push({ to, kind: "buyer", code: c.code });
  }
}

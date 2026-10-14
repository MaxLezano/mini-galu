import type { Letter, LetterMailer, LetterRepository, Subscriber, SubscriberRepository } from "../application/ports";

export class MemorySubscribers implements SubscriberRepository {
  list: (Subscriber & { source: string })[] = [];
  async findByEmail(email: string) {
    return this.list.find((s) => s.email === email) ?? null;
  }
  async create(s: { email: string; source: string; token: string }) {
    const row = { ...s, id: `s${this.list.length + 1}`, unsubscribedAt: null, createdAt: new Date() };
    this.list.push(row);
    return row;
  }
  async resubscribe(id: string) {
    const s = this.list.find((x) => x.id === id);
    if (s) s.unsubscribedAt = null;
  }
  async unsubscribe(token: string, at: Date) {
    const s = this.list.find((x) => x.token === token);
    if (!s) return false;
    s.unsubscribedAt = at;
    return true;
  }
  async active() {
    return this.list.filter((s) => !s.unsubscribedAt);
  }
  async countActive() {
    return (await this.active()).length;
  }
}

export class MemoryLetters implements LetterRepository {
  list: Letter[] = [];
  async create(l: { subject: string; body: string }) {
    const row = { ...l, id: `l${this.list.length + 1}`, recipients: 0, sentAt: null, createdAt: new Date() };
    this.list.push(row);
    return row;
  }
  async markSent(id: string, recipients: number, at: Date) {
    const l = this.list.find((x) => x.id === id);
    if (l) Object.assign(l, { recipients, sentAt: at });
  }
  async recent(limit: number) {
    return [...this.list].reverse().slice(0, limit);
  }
}

export class MemoryLetterMailer implements LetterMailer {
  sent: { kind: "welcome" | "letter"; to: string; subject?: string; unsubscribeUrl: string }[] = [];
  async welcome(to: string, unsubscribeUrl: string) {
    this.sent.push({ kind: "welcome", to, unsubscribeUrl });
  }
  async letter(m: { to: string; subject: string; unsubscribeUrl: string }) {
    this.sent.push({ kind: "letter", to: m.to, subject: m.subject, unsubscribeUrl: m.unsubscribeUrl });
  }
}

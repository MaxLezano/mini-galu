/**
 * Bus de eventos de dominio en proceso. Los módulos publican hechos (PaymentApproved, StockReplenished…)
 * y automations/notifications se suscriben. En la fase 6 los handlers lentos pasan a pg-boss.
 */
export type DomainEvent = { type: string; occurredAt: Date; payload: Record<string, unknown> };

type Handler = (event: DomainEvent) => void | Promise<void>;

export class EventBus {
  private handlers = new Map<string, Handler[]>();

  on(type: string, handler: Handler): () => void {
    const list = this.handlers.get(type) ?? [];
    list.push(handler);
    this.handlers.set(type, list);
    return () =>
      this.handlers.set(
        type,
        (this.handlers.get(type) ?? []).filter((h) => h !== handler),
      );
  }

  async publish(event: DomainEvent): Promise<void> {
    const list = this.handlers.get(event.type) ?? [];
    const results = await Promise.allSettled(list.map((h) => h(event)));
    for (const r of results) if (r.status === "rejected") console.error(`[events] ${event.type}:`, r.reason);
  }
}

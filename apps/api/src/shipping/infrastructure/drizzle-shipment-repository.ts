import { and, asc, type Db, eq, isNull, schema as s } from "@mini-galu/db";
import type { Shipment, ShipmentRepository } from "../application/ports";
import type { CarrierCode, CarrierEvent } from "../domain/tracking";

const toShipment = (r: typeof s.shipments.$inferSelect): Shipment => ({
  id: r.id,
  orderId: r.orderId,
  carrier: r.carrier,
  trackingNumber: r.trackingNumber,
  createdAt: r.createdAt,
  deliveredAt: r.deliveredAt,
});

export class DrizzleShipmentRepository implements ShipmentRepository {
  constructor(private readonly db: Db) {}

  async create(v: { orderId: string; carrier: string; trackingNumber: string }) {
    const [r] = await this.db.insert(s.shipments).values(v).returning();
    if (!r) throw new Error("No se pudo guardar el envío");
    return toShipment(r);
  }

  async byOrder(orderId: string) {
    const [r] = await this.db.select().from(s.shipments).where(eq(s.shipments.orderId, orderId));
    return r ? toShipment(r) : null;
  }

  async byTracking(trackingNumber: string) {
    const [r] = await this.db.select().from(s.shipments).where(eq(s.shipments.trackingNumber, trackingNumber));
    return r ? toShipment(r) : null;
  }

  async pending() {
    return (await this.db.select().from(s.shipments).where(isNull(s.shipments.deliveredAt))).map(toShipment);
  }

  async events(shipmentId: string): Promise<CarrierEvent[]> {
    const rows = await this.db
      .select()
      .from(s.shipmentEvents)
      .where(eq(s.shipmentEvents.shipmentId, shipmentId))
      .orderBy(asc(s.shipmentEvents.at));
    return rows.map((r) => ({ code: r.code as CarrierCode, title: r.title, location: r.location, at: r.at }));
  }

  async addEvents(shipmentId: string, events: CarrierEvent[], checkedAt: Date) {
    return this.db.transaction(async (tx) => {
      const fresh: CarrierEvent[] = [];
      for (const e of events) {
        const [row] = await tx
          .insert(s.shipmentEvents)
          .values({ shipmentId, ...e })
          .onConflictDoNothing()
          .returning({ id: s.shipmentEvents.id });
        if (row) fresh.push(e);
      }
      await tx.update(s.shipments).set({ checkedAt }).where(eq(s.shipments.id, shipmentId));
      return fresh;
    });
  }

  async markDelivered(shipmentId: string, at: Date) {
    await this.db
      .update(s.shipments)
      .set({ deliveredAt: at })
      .where(and(eq(s.shipments.id, shipmentId), isNull(s.shipments.deliveredAt)));
  }
}

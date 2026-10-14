import type { Shipment, ShipmentRepository } from "../application/ports";
import type { CarrierEvent } from "../domain/tracking";

export class MemoryShipments implements ShipmentRepository {
  list: Shipment[] = [];
  log = new Map<string, CarrierEvent[]>();

  constructor(private readonly clock: () => Date = () => new Date()) {}

  async create(v: { orderId: string; carrier: string; trackingNumber: string }) {
    const s = { ...v, id: `s${this.list.length + 1}`, createdAt: this.clock(), deliveredAt: null };
    this.list.push(s);
    return s;
  }
  async byOrder(orderId: string) {
    return this.list.find((s) => s.orderId === orderId) ?? null;
  }
  async byTracking(trackingNumber: string) {
    return this.list.find((s) => s.trackingNumber === trackingNumber) ?? null;
  }
  async pending() {
    return this.list.filter((s) => !s.deliveredAt);
  }
  async events(shipmentId: string) {
    return [...(this.log.get(shipmentId) ?? [])];
  }
  async addEvents(shipmentId: string, events: CarrierEvent[]) {
    const known = this.log.get(shipmentId) ?? [];
    const fresh = events.filter((e) => !known.some((k) => k.code === e.code && k.at.getTime() === e.at.getTime()));
    this.log.set(shipmentId, [...known, ...fresh]);
    return fresh;
  }
  async markDelivered(shipmentId: string, at: Date) {
    const s = this.list.find((x) => x.id === shipmentId);
    if (s) s.deliveredAt = at;
  }
}

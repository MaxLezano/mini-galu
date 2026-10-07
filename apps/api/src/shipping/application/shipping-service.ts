import {
  FREE_SHIPPING_FROM_CENTS,
  type ShippingMethod,
  type ShippingOption,
  type ShippingOptions,
} from "@mini-galu/contracts";
import { isValidSlot, pickupSlots } from "../domain/pickup";
import type { ShippingRates } from "./ports";

export const WORKSHOP = "Villa Crespo";

export class ShippingService {
  constructor(
    private readonly rates: ShippingRates,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  /** Opciones para mostrar en el checkout. Sin CP, domicilio y sucursal quedan sin precio. */
  async options(postalCode: string | undefined, subtotalCents: number): Promise<ShippingOptions> {
    const free = subtotalCents >= FREE_SHIPPING_FROM_CENTS;
    const q = postalCode ? await this.rates.quote(postalCode) : null;
    const options: ShippingOption[] = [
      {
        method: "domicilio",
        label: "Envío a domicilio",
        detail: q?.domicilio.detail ?? "Poné tu código postal para calcularlo",
        cents: q ? (free ? 0 : q.domicilio.cents) : null,
      },
      {
        method: "sucursal",
        label: "Retiro en sucursal",
        detail: q?.sucursal.detail ?? "Poné tu código postal para calcularlo",
        cents: q ? (free ? 0 : q.sucursal.cents) : null,
      },
      { method: "taller", label: "Retiro en el taller", detail: `${WORKSHOP} · elegís día y horario`, cents: 0 },
    ];
    return { options, pickupSlots: pickupSlots(this.clock()), workshop: WORKSHOP };
  }

  /** Costo de envío para cerrar el pedido (en centavos). */
  async cost(method: ShippingMethod, postalCode: string | undefined, subtotalCents: number): Promise<number | null> {
    if (method === "taller") return 0;
    if (!postalCode) return null;
    if (subtotalCents >= FREE_SHIPPING_FROM_CENTS) return 0;
    return (await this.rates.quote(postalCode))[method].cents;
  }

  validSlot(id: string): boolean {
    return isValidSlot(id, this.clock());
  }
}

import {
  FREE_SHIPPING_FROM_CENTS,
  type ShippingBranch,
  type ShippingMethod,
  type ShippingOption,
  type ShippingOptions,
} from "@mini-galu/contracts";
import { branchAddress, branchesFor, branchName } from "../domain/branches";
import { isValidSlot, pickupSlots } from "../domain/pickup";
import type { BranchDirectory, ShippingRates } from "./ports";

export const WORKSHOP = "Villa Crespo";

export class ShippingService {
  constructor(
    private readonly rates: ShippingRates,
    private readonly clock: () => Date = () => new Date(),
    private readonly directory: BranchDirectory | null = null,
  ) {}

  /** Sucursales donde retirar para un CP (vacío si no hay directorio o si el correo no responde). */
  async branches(postalCode: string): Promise<ShippingBranch[]> {
    if (!this.directory) return [];
    try {
      return branchesFor(await this.directory.all(), postalCode).map((b) => ({
        id: b.id,
        name: branchName(b.name),
        address: branchAddress(b),
        hours: b.hours,
      }));
    } catch (e) {
      console.warn("[envíos] no se pudieron consultar las sucursales:", e instanceof Error ? e.message : e);
      return [];
    }
  }

  /** La sucursal elegida, si sigue siendo una de las del CP. */
  async branch(postalCode: string, id: string): Promise<ShippingBranch | null> {
    return (await this.branches(postalCode)).find((b) => b.id === id) ?? null;
  }

  /** Opciones para mostrar en el checkout. Sin CP, domicilio y sucursal quedan sin precio. */
  async options(postalCode: string | undefined, subtotalCents: number): Promise<ShippingOptions> {
    const free = subtotalCents >= FREE_SHIPPING_FROM_CENTS;
    const [q, branches] = postalCode
      ? await Promise.all([this.rates.quote(postalCode), this.branches(postalCode)])
      : [null, []];
    const near = branches[0];
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
        detail: near
          ? `Sucursal ${near.name} · ${near.address}`
          : (q?.sucursal.detail ?? "Poné tu código postal para calcularlo"),
        cents: q ? (free ? 0 : q.sucursal.cents) : null,
      },
      { method: "taller", label: "Retiro en el taller", detail: `${WORKSHOP} · elegís día y horario`, cents: 0 },
    ];
    return { options, pickupSlots: pickupSlots(this.clock()), workshop: WORKSHOP, branches };
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

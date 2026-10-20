import {
  DEFAULT_POLICIES,
  freeShippingFrom,
  type LocalDeliveryInfo,
  localDeliveryFor,
  qualifiesForFreeShipping,
  type ShippingBranch,
  type ShippingMethod,
  type ShippingOption,
  type ShippingOptions,
  type StorePolicies,
} from "@mini-galu/contracts";
import { ValidationError } from "../../shared/domain/errors";
import { branchAddress, branchesFor, branchName } from "../domain/branches";
import { isValidSlot, pickupSlots } from "../domain/pickup";
import type { BranchDirectory, PoliciesReader, ShippingRates } from "./ports";

export class ShippingService {
  constructor(
    private readonly rates: ShippingRates,
    private readonly clock: () => Date = () => new Date(),
    private readonly directory: BranchDirectory | null = null,
    private readonly policies: PoliciesReader = { get: async () => DEFAULT_POLICIES },
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

  /** Opciones para mostrar en el checkout (solo las formas de entrega prendidas en el panel). Sin CP, domicilio y sucursal quedan sin precio. */
  async options(postalCode: string | undefined, subtotalCents: number): Promise<ShippingOptions> {
    const p = await this.policies.get();
    const free = qualifiesForFreeShipping(p, subtotalCents);
    const shipped = p.methods.domicilio || p.methods.sucursal;
    const [q, branches] =
      postalCode && shipped
        ? await Promise.all([this.rates.quote(postalCode), p.methods.sucursal ? this.branches(postalCode) : []])
        : [null, []];
    const near = branches[0];
    const options: ShippingOption[] = [];
    if (p.methods.domicilio)
      options.push({
        method: "domicilio",
        label: "Envío a domicilio",
        detail: q?.domicilio.detail ?? "Poné tu código postal para calcularlo",
        cents: q ? (free ? 0 : q.domicilio.cents) : null,
      });
    if (p.methods.sucursal)
      options.push({
        method: "sucursal",
        label: "Retiro en sucursal",
        detail: near
          ? `Sucursal ${near.name} · ${near.address}`
          : (q?.sucursal.detail ?? "Poné tu código postal para calcularlo"),
        cents: q ? (free ? 0 : q.sucursal.cents) : null,
      });
    if (p.methods.taller)
      options.push({
        method: "taller",
        label: "Retiro en el taller",
        detail: `${p.workshop.city} · elegís día y horario`,
        cents: 0,
      });
    return {
      options,
      pickupSlots: p.methods.taller ? pickupSlots(this.clock(), p.pickupHours) : [],
      workshop: p.workshop.city,
      localDelivery: postalCode ? localDelivery(p, postalCode) : null,
      branches,
    };
  }

  /** Costo de envío para cerrar el pedido (en centavos). */
  async cost(method: ShippingMethod, postalCode: string | undefined, subtotalCents: number): Promise<number | null> {
    if (method === "taller") return 0;
    if (!postalCode) return null;
    if (qualifiesForFreeShipping(await this.policies.get(), subtotalCents)) return 0;
    return (await this.rates.quote(postalCode))[method].cents;
  }

  /** Desde qué monto el envío es gratis (null: no hay). */
  async freeShippingFrom(): Promise<number | null> {
    return freeShippingFrom(await this.policies.get());
  }

  /** Para un pedido nuevo: la forma de entrega tiene que estar prendida y la franja de retiro, ofrecerse. */
  async checkDelivery(s: { method: ShippingMethod; pickupSlot?: string | null }): Promise<void> {
    const p = await this.policies.get();
    if (!p.methods[s.method]) throw new ValidationError("Esa forma de entrega ya no está disponible, elegí otra");
    if (s.method === "taller" && !isValidSlot(s.pickupSlot ?? "", this.clock(), p.pickupHours))
      throw new ValidationError("Ese horario de retiro ya no está disponible, elegí otro");
  }
}

/** La cadetería de la ciudad del taller: se muestra con su precio desde y se coordina por WhatsApp. */
function localDelivery(p: StorePolicies, postalCode: string): LocalDeliveryInfo | null {
  const d = localDeliveryFor(p, postalCode);
  return d && { label: `Cadete en ${p.workshop.city}`, fromCents: d.fromCents, whatsapp: p.contact.whatsapp };
}

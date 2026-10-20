import {
  DEFAULT_POLICIES,
  freeShippingFrom,
  isAndreani,
  isArranged,
  localDeliveryFor,
  qualifiesForFreeShipping,
  type ShippingBranch,
  type ShippingMethod,
  type ShippingOption,
  type ShippingOptions,
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

  /**
   * Opciones para la ficha y el checkout, solo las prendidas en el panel: Andreani (si está conectado; sin CP, sin
   * precio), envío a acordar, retiro en el taller y el cadete (solo si el CP es de la ciudad del taller).
   */
  async options(postalCode: string | undefined, subtotalCents: number): Promise<ShippingOptions> {
    const p = await this.policies.get();
    const free = qualifiesForFreeShipping(p, subtotalCents);
    const andreani = this.rates.available && (p.methods.domicilio || p.methods.sucursal);
    const [q, branches] =
      postalCode && andreani
        ? await Promise.all([this.rates.quote(postalCode), p.methods.sucursal ? this.branches(postalCode) : []])
        : [null, []];
    const near = branches[0];
    // con CP y sin precio es que Andreani no respondió: se dice y se puede elegir otra forma de entrega
    const pending = postalCode ? "Andreani no respondió: probá en un rato o elegí otra forma de entrega" : NO_CP;
    const options: ShippingOption[] = [];
    if (andreani && p.methods.domicilio)
      options.push({
        method: "domicilio",
        label: "Envío a domicilio",
        detail: q?.domicilio.detail ?? pending,
        cents: q ? (free ? 0 : q.domicilio.cents) : null,
      });
    if (andreani && p.methods.sucursal)
      options.push({
        method: "sucursal",
        label: "Retiro en sucursal",
        detail: near ? `Sucursal ${near.name} · ${near.address}` : (q?.sucursal.detail ?? pending),
        cents: q ? (free ? 0 : q.sucursal.cents) : null,
      });
    if (p.methods.acordar)
      options.push({
        method: "acordar",
        label: "Acordar envío",
        detail: "Te escribimos por WhatsApp y vemos juntos cómo y por dónde mandarlo",
        cents: 0,
        arranged: { fromCents: null },
      });
    if (p.methods.taller)
      options.push({
        method: "taller",
        label: "Retiro en el taller",
        detail: `${p.workshop.city} · elegís día y horario`,
        cents: 0,
      });
    const local = postalCode ? localDeliveryFor(p, postalCode) : null;
    if (local)
      options.push({
        method: "cadete",
        label: `Cadete en ${p.workshop.city}`,
        detail: "Lo coordinamos por WhatsApp según tu dirección",
        cents: 0,
        arranged: { fromCents: local.fromCents },
      });
    return {
      options,
      pickupSlots: p.methods.taller ? pickupSlots(this.clock(), p.pickupHours) : [],
      workshop: p.workshop.city,
      branches,
    };
  }

  /**
   * Costo de envío en centavos (null si todavía no se puede saber). Envío a acordar y cadete no se cobran en la web
   * (se arreglan por WhatsApp); Andreani, lo que cotiza Andreani.
   */
  async cost(method: ShippingMethod, postalCode: string | undefined, subtotalCents: number): Promise<number | null> {
    if (method === "taller" || isArranged(method)) return 0;
    if (!postalCode) return null;
    if (qualifiesForFreeShipping(await this.policies.get(), subtotalCents)) return 0;
    return (await this.rates.quote(postalCode))?.[method].cents ?? null;
  }

  /** El costo para cerrar un pedido: si Andreani no cotizó, no se cobra un envío inventado (se elige otra entrega). */
  async charge(method: ShippingMethod, postalCode: string | undefined, subtotalCents: number): Promise<number> {
    const cents = await this.cost(method, postalCode, subtotalCents);
    if (cents === null)
      throw new ValidationError(
        "Andreani no pudo cotizar el envío ahora: probá en un rato o elegí otra forma de entrega",
      );
    return cents;
  }

  /** Desde qué monto el envío es gratis (null: no hay). */
  async freeShippingFrom(): Promise<number | null> {
    return freeShippingFrom(await this.policies.get());
  }

  /**
   * Para un pedido nuevo: la forma de entrega tiene que estar prendida (Andreani, además, conectado), el cadete llegar
   * a ese CP y la franja de retiro, ofrecerse.
   */
  async checkDelivery(s: { method: ShippingMethod; pickupSlot?: string | null; postalCode?: string }): Promise<void> {
    const p = await this.policies.get();
    const off = !p.methods[s.method] || (isAndreani(s.method) && !this.rates.available);
    if (off) throw new ValidationError("Esa forma de entrega ya no está disponible, elegí otra");
    if (s.method === "cadete" && !localDeliveryFor(p, s.postalCode ?? ""))
      throw new ValidationError(`El cadete llega solo dentro de ${p.workshop.city}: elegí otra forma de entrega`);
    if (s.method === "taller" && !isValidSlot(s.pickupSlot ?? "", this.clock(), p.pickupHours))
      throw new ValidationError("Ese horario de retiro ya no está disponible, elegí otro");
  }
}

const NO_CP = "Poné tu código postal para calcularlo";

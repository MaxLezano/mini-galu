import {
  DEFAULT_POLICIES,
  type StorePolicies,
  type StorePoliciesInput,
  StorePoliciesSchema,
  withDefaults,
} from "@mini-galu/contracts";
import { ValidationError } from "../../shared/domain/errors";
import type { PoliciesStore } from "./ports";

/**
 * Ajustes de la tienda que Gaby edita en "Tienda y pagos": cambios, envío gratis, formas de entrega, zonas y
 * cadetería, horarios de retiro, vigencia de las gift cards, contacto y taller. Los leen envíos, checkout, ayuda,
 * gift cards, Galú, los mails y la tienda; lo que nunca se guardó rige de `DEFAULT_POLICIES`.
 */
export class PoliciesService {
  /** @param cuit el del certificado de ARCA (`ARCA_CUIT`): va en el pie de la tienda; null sin ARCA. */
  constructor(
    private readonly store: PoliciesStore,
    private readonly cuit: string | null = null,
  ) {}

  async get(): Promise<StorePolicies> {
    const r = StorePoliciesSchema.safeParse(withDefaults(await this.store.get()));
    if (r.success) return this.withCuit(r.data);
    console.warn("[ajustes] lo guardado no es válido, rige la base:", r.error.issues[0]?.message);
    return this.withCuit(DEFAULT_POLICIES);
  }

  /** Cada caja del panel manda solo lo suyo: se completa con lo que ya estaba. */
  async save(input: StorePoliciesInput): Promise<StorePolicies> {
    const r = StorePoliciesSchema.safeParse({ ...(await this.get()), ...input });
    if (!r.success) throw new ValidationError(r.error.issues[0]?.message ?? "Revisá los ajustes", r.error.issues);
    const saved = { ...r.data, fiscal: { ...r.data.fiscal, cuit: "" } };
    await this.store.save(saved);
    return this.withCuit(saved);
  }

  private withCuit(p: StorePolicies): StorePolicies {
    return { ...p, fiscal: { ...p.fiscal, cuit: this.cuit ?? "" } };
  }
}

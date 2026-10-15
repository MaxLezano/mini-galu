import { DEFAULT_POLICIES, type StorePolicies, StorePoliciesSchema } from "@mini-galu/contracts";
import { ValidationError } from "../../shared/domain/errors";
import type { PoliciesStore } from "./ports";

/**
 * Políticas de la tienda (días de cambio, envío gratis, formas de entrega, tarifas y horarios de retiro).
 * Las leen envíos, checkout, ayuda, Galú y los mails; sin nada guardado rigen las de base.
 */
export class PoliciesService {
  constructor(private readonly store: PoliciesStore) {}

  async get(): Promise<StorePolicies> {
    return (await this.store.get()) ?? DEFAULT_POLICIES;
  }

  async save(input: StorePolicies): Promise<StorePolicies> {
    const r = StorePoliciesSchema.safeParse(input);
    if (!r.success) throw new ValidationError(r.error.issues[0]?.message ?? "Revisá las políticas", r.error.issues);
    await this.store.save(r.data);
    return r.data;
  }
}

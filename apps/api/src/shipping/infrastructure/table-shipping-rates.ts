import { DEFAULT_POLICIES, zoneQuote } from "@mini-galu/contracts";
import type { PoliciesReader, ShippingRates } from "../application/ports";

/**
 * Tabla por zona de CP (AMBA, centro, resto) que Gaby edita en "Tienda y pagos". Se usa sin credenciales de Andreani
 * y como respaldo si Andreani no responde.
 */
export class TableShippingRates implements ShippingRates {
  constructor(private readonly policies: PoliciesReader = { get: async () => DEFAULT_POLICIES }) {}

  async quote(postalCode: string) {
    return zoneQuote(await this.policies.get(), postalCode);
  }
}

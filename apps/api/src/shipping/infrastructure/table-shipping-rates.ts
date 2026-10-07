import type { ShippingRates } from "../application/ports";

/**
 * Tabla por zona de CP (AMBA, centro, resto). Es la misma estimación que mostraba la ficha.
 * TODO(fase 5 · shipping): reemplazar por la cotización de Andreani.
 */
export class TableShippingRates implements ShippingRates {
  async quote(postalCode: string) {
    const cp = Number.parseInt(postalCode.replace(/\D/g, ""), 10) || 9999;
    const amba = cp < 1900;
    const base = amba ? 5_900_00 : cp < 5000 ? 7_400_00 : 8_900_00;
    return {
      domicilio: { cents: base, detail: amba ? "Llega en 2 a 3 días hábiles" : "Llega en 4 a 6 días hábiles" },
      sucursal: {
        cents: Math.round(base * 0.72),
        detail: "Te confirmamos la sucursal Andreani más cercana a tu CP antes de despachar",
      },
    };
  }
}

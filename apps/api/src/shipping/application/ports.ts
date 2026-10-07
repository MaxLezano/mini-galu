/**
 * Puerto de cotización. Hoy: tabla por código postal (`TableShippingRates`).
 * Fase 5: FakeAndreani / Andreani (cotización real, sucursales, etiqueta y seguimiento).
 */
export interface ShippingRates {
  /** Precios en centavos y texto de plazo para un CP. */
  quote(postalCode: string): Promise<{
    domicilio: { cents: number; detail: string };
    sucursal: { cents: number; detail: string };
  }>;
}

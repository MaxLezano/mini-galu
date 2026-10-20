import type { ShippingRates } from "../application/ports";

/**
 * Andreani simulado (local y CI, sin credenciales), como `FakeAndreani` para las etiquetas: un precio de prueba fijo
 * para poder comprar de punta a punta. En producción sin credenciales no se usa (ver `NoAndreaniRates`).
 */
export class SimulatedAndreaniRates implements ShippingRates {
  readonly available = true;

  async quote(_postalCode: string) {
    return {
      domicilio: { cents: 8_900_00, detail: "Precio de prueba: Andreani todavía no está conectado" },
      sucursal: { cents: 6_400_00, detail: "Precio de prueba: Andreani todavía no está conectado" },
    };
  }
}

/** Producción sin credenciales de Andreani: no se ofrece (quedan envío a acordar, cadete y retiro). */
export class NoAndreaniRates implements ShippingRates {
  readonly available = false;

  async quote() {
    return null;
  }
}

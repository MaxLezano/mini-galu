/** Estados del pedido (PLAN §5). Se usan desde la fase 3; viven acá para que web y api hablen igual. */
export const ORDER_STATUSES = {
  esperando_pago: { label: "Esperando pago", short: "Esperando pago", tone: "st-muted", icon: "hourglass" },
  nuevo: { label: "Nuevos", short: "Nuevo", tone: "st-rose", icon: "inbox" },
  preparando: { label: "Preparando", short: "Preparando", tone: "st-warn", icon: "scissors" },
  listo: { label: "Listos para despachar", short: "Listo", tone: "st-sand", icon: "package-check" },
  en_camino: { label: "En camino", short: "En camino", tone: "st-ok", icon: "truck" },
  entregado: { label: "Entregados", short: "Entregado", tone: "st-done", icon: "circle-check" },
  cancelado: { label: "Cancelados", short: "Cancelado", tone: "st-muted", icon: "circle-x" },
  reembolsado: { label: "Reembolsados", short: "Reembolsado", tone: "st-muted", icon: "undo-2" },
} as const;
export type OrderStatus = keyof typeof ORDER_STATUSES;

export const PAYMENT_METHODS = {
  credito: "Tarjeta de crédito",
  debito: "Tarjeta de débito",
  dinero_cuenta: "Dinero en cuenta MP",
  link: "Link de pago MP",
  giftcard: "Gift card",
  /** Venta en el taller cobrada en el momento (sin Mercado Pago). */
  efectivo: "Efectivo",
} as const;
export type PaymentMethod = keyof typeof PAYMENT_METHODS;

export const SHIPPING_METHODS = {
  domicilio: "Andreani a domicilio",
  sucursal: "Andreani a sucursal",
  /** El cliente y Gaby arreglan por WhatsApp cómo y por dónde se manda (no se cobra en la web). */
  acordar: "Envío a acordar",
  taller: "Retiro en el taller",
  /** Cadete propio en la ciudad del taller (no se cobra en la web: se coordina por WhatsApp). */
  cadete: "Cadete",
} as const;
/** Las que despacha Andreani (etiqueta, seguimiento y cotización). */
export const isAndreani = (m: ShippingMethod) => m === "domicilio" || m === "sucursal";
/** Las que se coordinan por WhatsApp: el envío no se cobra en la web. */
export const isArranged = (m: ShippingMethod) => m === "acordar" || m === "cadete";
export type ShippingMethod = keyof typeof SHIPPING_METHODS;

import type { OrderStatus, ShippingMethod } from "@mini-galu/contracts";

/** Titular grande de la tarjeta (seguimiento.html → etaTxt): [antes, resaltado, después]. */
export function headline(status: OrderStatus, method: ShippingMethod): [string, string, string] {
  switch (status) {
    case "esperando_pago":
      return ["Esperando ", "tu pago", ""];
    case "nuevo":
    case "preparando":
      return ["Ya lo estamos ", "preparando", ""];
    case "listo":
      return method === "taller" ? ["Listo para ", "retirar", ""] : ["Sale ", "pronto", " con Andreani"];
    case "en_camino":
      return ["Llega en ", "2 a 3 días", ""];
    case "entregado":
      return method === "taller" ? ["¡", "Retirado", "!"] : ["¡", "Entregado", "!"];
    case "cancelado":
      return ["Pedido ", "cancelado", ""];
    case "reembolsado":
      return ["Pedido ", "reembolsado", ""];
  }
}

/** Nota manuscrita al costado del titular. */
export function handNote(status: OrderStatus, method: ShippingMethod): string {
  if (status === "esperando_pago") return "te guardamos las prendas ♡";
  if (status === "en_camino") return "¡ya casi llega! ♡";
  if (status === "entregado") return "¡que lo disfrute! ♡";
  if (status === "listo" && method === "taller") return "te esperamos ♡";
  return "con mucho amor ♡";
}

/** Lo que escribe el cliente: "mg 1042", "#MG-1042" o el número de Andreani con espacios. */
export function normalizeCode(input: string): string {
  const t = input.trim().toUpperCase().replace(/^#/, "");
  if (/^\d[\d\s]{7,}$/.test(t)) return t.replace(/\s/g, "");
  const m = /^(?:MG)?[\s-]*(\d{4,9})$/.exec(t);
  return m ? `MG-${m[1]}` : t;
}

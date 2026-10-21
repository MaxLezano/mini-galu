import { type OrderStatus, REVOCATION_DAYS } from "@mini-galu/contracts";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Sin 0/O ni 1/I/L: se dicta por teléfono o se copia a mano. */
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

/** Código de la solicitud que se le da al cliente (Res. SCI 424/2020): ARR-7K2M9Q. */
export function revocationCode(random: () => number = Math.random): string {
  let s = "";
  for (let i = 0; i < 6; i++) s += ALPHABET[Math.floor(random() * ALPHABET.length)];
  return `ARR-${s}`;
}

/** Por qué un pedido no admite la baja (null: se puede pedir). */
export function revocationBlocked(status: OrderStatus): string | null {
  if (status === "esperando_pago")
    return "Ese pedido todavía no está pago: si no lo pagás, se cancela solo y no se te cobra nada";
  if (status === "cancelado" || status === "reembolsado") return "Ese pedido ya está cancelado";
  return null;
}

/**
 * Ley 24.240, art. 34: 10 días corridos desde que se entrega (o se celebra el contrato, lo último).
 * Si todavía no lo recibió, está en plazo. Fuera de plazo igual se registra: el taller lo revisa.
 */
export function revocationInTime(o: { status: OrderStatus; statusChangedAt: Date }, now: Date): boolean {
  if (o.status !== "entregado") return true;
  return now.getTime() - o.statusChangedAt.getTime() <= REVOCATION_DAYS * DAY_MS;
}

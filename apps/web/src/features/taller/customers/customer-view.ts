import type { AdminCustomer } from "@mini-galu/contracts";

export type CustomerFilter = "all" | "bday" | "repeat" | "new";

export const CUSTOMER_FILTERS: [CustomerFilter, string][] = [
  ["all", "Todas"],
  ["bday", "Cumple en 30 días"],
  ["repeat", "Volvieron a comprar"],
  ["new", "Nuevas este mes"],
];

/** Filtro de chips + búsqueda por nombre, mail o localidad. `month`: "YYYY-MM" de hoy en Argentina. */
export function filterCustomers(list: AdminCustomer[], filter: CustomerFilter, q: string, month: string) {
  const needle = q.trim().toLowerCase();
  return list.filter((c) => {
    const ok = {
      all: true,
      bday: !!c.nextBirthday && c.nextBirthday.inDays <= 30,
      repeat: c.orders > 1,
      new: c.since.slice(0, 7) === month,
    }[filter];
    return ok && (!needle || `${c.name} ${c.email} ${c.city ?? ""}`.toLowerCase().includes(needle));
  });
}

/** Link de WhatsApp (el teléfono ya viene en E.164: +5491155551234). */
export const whatsappHref = (phone: string) => `https://wa.me/${phone.replace(/\D/g, "")}`;

/** "faltan 6 días", "es hoy", "mañana". */
export function inDaysLabel(days: number): string {
  if (days === 0) return "es hoy";
  if (days === 1) return "mañana";
  return `en ${days} días`;
}

import type { AdminCustomer, AdminCustomerChild, AdminCustomers, NextBirthday } from "@mini-galu/contracts";

/** Lo que importa de cada pedido para la lista de clientes. */
export type CustomerOrderFact = {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  /** Localidad del envío (o provincia); null si retiró en el taller. */
  city: string | null;
  createdAt: Date;
  /** Pagado y no cancelado ni reembolsado: cuenta como compra. */
  paid: boolean;
  totalCents: number;
};

/** Una cuenta de la tienda con sus nenas. */
export type CustomerAccountFact = {
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  createdAt: Date;
  children: AdminCustomerChild[];
};

const DAY = 86_400_000;
const utc = (ymd: string) => Date.UTC(+ymd.slice(0, 4), +ymd.slice(5, 7) - 1, +ymd.slice(8, 10));
const leap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

/** El próximo cumple de un "YYYY-MM-DD" desde `today` (también "YYYY-MM-DD"); el 29/2 se festeja el 28 si no hay. */
export function birthdayAfter(birthday: string, today: string): { date: string; inDays: number } {
  const md = birthday.slice(5);
  const on = (y: number) => `${y}-${md === "02-29" && !leap(y) ? "02-28" : md}`;
  const y = +today.slice(0, 4);
  const next = utc(on(y)) >= utc(today) ? on(y) : on(y + 1);
  return { date: next, inDays: Math.round((utc(next) - utc(today)) / DAY) };
}

/** El cumple que viene antes entre las nenas que tienen fecha. */
export function nextBirthday(children: AdminCustomerChild[], today: string): NextBirthday | null {
  let best: NextBirthday | null = null;
  for (const c of children) {
    if (!c.birthday) continue;
    const b = birthdayAfter(c.birthday, today);
    if (!best || b.inDays < best.inDays) best = { name: c.name, ...b };
  }
  return best;
}

/**
 * Clientes del taller: todo el que compró (con o sin cuenta, por mail) y las cuentas registradas. Los datos de
 * contacto salen del pedido más nuevo (o de la cuenta); las nenas, de la cuenta. Ordenados por lo gastado.
 */
export function buildCustomers(
  orders: CustomerOrderFact[],
  accounts: CustomerAccountFact[],
  today: string,
): AdminCustomer[] {
  const byEmail = new Map<string, AdminCustomer & { last: number }>();
  const get = (email: string, seed: Omit<AdminCustomer, "email">, at: number) => {
    const key = email.toLowerCase();
    const found = byEmail.get(key);
    if (found) return found;
    const c = { email: key, ...seed, last: at };
    byEmail.set(key, c);
    return c;
  };
  for (const o of [...orders].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())) {
    const at = o.createdAt.getTime();
    const c = get(
      o.email,
      {
        name: "",
        phone: null,
        city: null,
        since: o.createdAt.toISOString(),
        hasAccount: false,
        orders: 0,
        spentCents: 0,
        children: [],
        nextBirthday: null,
      },
      at,
    );
    // el pedido más nuevo manda en los datos de contacto
    c.name = `${o.firstName} ${o.lastName}`.trim();
    c.phone = o.phone || c.phone;
    c.city = o.city ?? c.city;
    c.last = at;
    if (o.paid) {
      c.orders++;
      c.spentCents += o.totalCents;
    }
  }
  for (const a of accounts) {
    const c = get(
      a.email,
      {
        name: `${a.firstName} ${a.lastName}`.trim(),
        phone: a.phone,
        city: null,
        since: a.createdAt.toISOString(),
        hasAccount: true,
        orders: 0,
        spentCents: 0,
        children: [],
        nextBirthday: null,
      },
      a.createdAt.getTime(),
    );
    c.hasAccount = true;
    c.children = a.children;
    c.nextBirthday = nextBirthday(a.children, today);
    if (a.createdAt.toISOString() < c.since) c.since = a.createdAt.toISOString();
    if (!c.phone && a.phone) c.phone = a.phone;
    if (!c.name) c.name = `${a.firstName} ${a.lastName}`.trim();
  }
  return [...byEmail.values()]
    .map(({ last: _last, ...c }) => c)
    .sort((a, b) => b.spentCents - a.spentCents || a.name.localeCompare(b.name, "es"));
}

/** Los números de arriba de Clientes. "Pronto": el cumple llega en 30 días o menos. */
export function customerKpis(list: AdminCustomer[]): AdminCustomers["kpis"] {
  return {
    customers: list.length,
    repeat: list.filter((c) => c.orders > 1).length,
    birthdaysSoon: list.filter((c) => c.nextBirthday && c.nextBirthday.inDays <= 30).length,
    children: list.reduce((a, c) => a + c.children.length, 0),
  };
}

/** CSV para exportar (Excel en español usa ";" y abre bien el UTF-8 con BOM). */
export function customersCsv(list: AdminCustomer[], money: (cents: number) => string): string {
  const cell = (v: string | number | null) => {
    const s = v === null ? "" : String(v);
    return /[";\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
  };
  const rows = [
    ["Nombre", "Email", "Celular", "Localidad", "Desde", "Pedidos", "Gastado", "Nenas", "Próximo cumple"],
    ...list.map((c) => [
      c.name,
      c.email,
      c.phone,
      c.city,
      c.since.slice(0, 10),
      c.orders,
      money(c.spentCents),
      c.children.map((n) => `${n.name}${n.size ? ` (talle ${n.size})` : ""}`).join(", "),
      c.nextBirthday ? `${c.nextBirthday.name} · ${c.nextBirthday.date}` : null,
    ]),
  ];
  return `﻿${rows.map((r) => r.map(cell).join(";")).join("\n")}\n`;
}

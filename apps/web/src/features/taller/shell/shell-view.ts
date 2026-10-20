import {
  type AdminCustomer,
  type AdminOrderSummary,
  type AdminProduct,
  type PendingQuestion,
  questionKey,
} from "@mini-galu/contracts";
import { stripAccents } from "../../../lib/product";

/** Números del menú: pedidos para preparar y productos con algún talle a punto de agotarse (admin.js). */
export function navCounts(orders: AdminOrderSummary[], products: AdminProduct[]) {
  return {
    pedidos: orders.filter((o) => o.status === "nuevo" || o.status === "preparando").length,
    stock: products.filter((p) => p.status === "published" && p.variants.some((v) => v.stock === 1)).length,
  };
}

export type Notice = {
  /** Identifica la novedad para "Marcar como leídas" (cambia si cambia lo que avisa). */
  key: string;
  kind: "pedido" | "sin_pagar" | "galu" | "stock";
  title: string;
  text: string;
  /** ISO: cuándo pasó (los avisos de stock no tienen fecha). */
  at: string | null;
  order?: string;
  href?: string;
};

/** La campana: pedidos nuevos, links de pago sin pagar, lo que Galú no supo y talles con la última unidad. */
export function notices(
  orders: AdminOrderSummary[],
  products: AdminProduct[],
  money: (c: number) => string,
  pending: PendingQuestion[] = [],
): Notice[] {
  const nuevos = orders
    .filter((o) => o.status === "nuevo")
    .map<Notice>((o) => ({
      key: `nuevo:${o.number}`,
      kind: "pedido",
      title: `Pedido nuevo #${o.number}`,
      text: `${o.customer.name} · ${money(o.totalCents)}`,
      at: o.statusChangedAt,
      order: o.number,
    }));
  const sinPagar = orders
    .filter((o) => o.status === "esperando_pago")
    .map<Notice>((o) => ({
      key: `sin_pagar:${o.number}`,
      kind: "sin_pagar",
      title: `#${o.number} sin pagar`,
      text: `Link enviado a ${o.customer.name.split(" ")[0]}`,
      at: o.createdAt,
      order: o.number,
    }));
  // las más preguntadas primero; si la vuelven a preguntar, vuelve a sonar
  const galu = pending.slice(0, 3).map<Notice>((q) => ({
    key: `galu:${questionKey(q.question)}:${q.times}`,
    kind: "galu",
    title: "Galú no supo responder",
    text: `“${q.question}”${q.times > 1 ? ` · ${q.times} veces` : ""}`,
    at: q.lastAt,
    href: "/taller/galu",
  }));
  const stock = products
    .filter((p) => p.status === "published")
    .flatMap((p) => p.variants.filter((v) => v.stock === 1).map((v) => ({ p, size: v.size })))
    .slice(0, 2)
    .map<Notice>(({ p, size }) => ({
      key: `stock:${p.slug}:${size}`,
      kind: "stock",
      title: `Queda 1 en talle ${size}`,
      text: p.name,
      at: null,
      href: `/taller/productos?editar=${p.slug}`,
    }));
  return [...nuevos, ...sinPagar, ...galu, ...stock];
}

/** Búsqueda global: pedidos por número, cliente o ciudad; clientes por nombre o mail; productos por nombre. */
export function searchAll(
  q: string,
  orders: AdminOrderSummary[],
  products: AdminProduct[],
  customers: AdminCustomer[] = [],
) {
  const t = stripAccents(q.trim());
  if (!t) return { orders: [], customers: [], products: [] };
  return {
    orders: orders
      .filter((o) => stripAccents(`${o.number} ${o.customer.name} ${o.customer.city ?? ""}`).includes(t))
      .slice(0, 4),
    customers: customers.filter((c) => stripAccents(`${c.name} ${c.email}`).includes(t)).slice(0, 3),
    products: products.filter((p) => stripAccents(`${p.name} ${p.slug}`).includes(t)).slice(0, 4),
  };
}

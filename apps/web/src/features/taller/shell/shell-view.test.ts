import type { AdminOrderSummary, AdminProduct } from "@mini-galu/contracts";
import { describe, expect, it } from "vitest";
import { navCounts, notices, searchAll } from "./shell-view";

const order = (number: string, status: string, name = "Lucía Fernández", city = "CABA") =>
  ({
    number,
    status,
    customer: { name, city },
    totalCents: 1000_00,
    createdAt: "2026-10-13T10:00:00Z",
    statusChangedAt: "2026-10-13T11:00:00Z",
  }) as AdminOrderSummary;
const product = (slug: string, name: string, stocks: number[], status = "published") =>
  ({
    slug,
    name,
    status,
    variants: stocks.map((stock, i) => ({ size: String(2 + i * 2), stock })),
  }) as unknown as AdminProduct;

const orders = [
  order("MG-1001", "nuevo"),
  order("MG-1002", "preparando", "Carla Méndez", "Rosario"),
  order("MG-1003", "esperando_pago", "Natalia Ruiz"),
  order("MG-1004", "listo"),
];
const products = [
  product("maddie", "Set Maddie", [1, 4]),
  product("samanta", "Vestido Samanta", [0, 3]),
  product("borrador", "Borrador", [1], "draft"),
];

describe("armazón del panel", () => {
  it("contadores del menú", () => {
    expect(navCounts(orders, products)).toEqual({ pedidos: 2, stock: 1 });
  });

  it("la campana avisa pedidos nuevos, links sin pagar y la última unidad de un talle", () => {
    const n = notices(orders, products, (c) => `$${c / 100}`);
    expect(n.map((x) => x.title)).toEqual(["Pedido nuevo #MG-1001", "#MG-1003 sin pagar", "Queda 1 en talle 2"]);
    expect(n[0]).toMatchObject({ text: "Lucía Fernández · $1000", order: "MG-1001" });
    expect(n[2]?.href).toBe("/taller/productos?editar=maddie");
  });

  it("busca pedidos por número, cliente o ciudad (sin tildes) y productos por nombre", () => {
    expect(searchAll("1002", orders, products).orders.map((o) => o.number)).toEqual(["MG-1002"]);
    expect(searchAll("mendez", orders, products).orders.map((o) => o.number)).toEqual(["MG-1002"]);
    expect(searchAll("rosario", orders, products).orders).toHaveLength(1);
    expect(searchAll("samanta", orders, products).products.map((p) => p.slug)).toEqual(["samanta"]);
    expect(searchAll("  ", orders, products)).toEqual({ orders: [], products: [] });
  });
});

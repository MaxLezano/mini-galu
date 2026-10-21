import type { AdminCustomer, AdminOrderSummary, AdminProduct } from "@mini-galu/contracts";
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

  it("la campana avisa lo que Galú no supo responder (hasta 3) y vuelve a sonar si lo preguntan otra vez", () => {
    const q = (question: string, times: number) => ({ question, times, lastAt: "2026-10-14T10:00:00Z" });
    const pending = [
      q("¿Hacen a medida?", 2),
      q("¿Tienen talle 12?", 1),
      q("¿Envían a Chile?", 1),
      q("¿Y a Uruguay?", 1),
    ];
    const galu = notices(orders, products, String, pending).filter((x) => x.kind === "galu");
    expect(galu).toHaveLength(3);
    expect(galu[0]).toEqual({
      key: "galu:hacen a medida:2",
      kind: "galu",
      title: "Galú no supo responder",
      text: "“¿Hacen a medida?” · 2 veces",
      at: "2026-10-14T10:00:00Z",
      href: "/taller/galu",
    });
    expect(galu[1]?.text).toBe("“¿Tienen talle 12?”");
    const [again] = notices(orders, products, String, [q("¿hacen a medida?", 3)]).filter((x) => x.kind === "galu");
    expect(again?.key).not.toBe(galu[0]?.key);
    // van después de los pedidos y antes del stock
    expect(notices(orders, products, String, pending).map((x) => x.kind)).toEqual([
      "pedido",
      "sin_pagar",
      "galu",
      "galu",
      "galu",
      "stock",
    ]);
  });

  it("avisa de las facturas que ARCA no emitió (y vuelve a sonar si cambia el error)", () => {
    const problem = { orderNumber: "MG-1004", kind: "factura" as const, error: "503", since: "2026-10-21T15:00:00Z" };
    const [f] = notices(orders, products, String, [], [problem]).filter((x) => x.kind === "factura");
    expect(f).toEqual({
      key: "factura:MG-1004:factura:503",
      kind: "factura",
      title: "#MG-1004 sin facturar",
      text: "Factura C: 503",
      at: "2026-10-21T15:00:00Z",
      order: "MG-1004",
    });
    const [again] = notices(orders, products, String, [], [{ ...problem, error: "10016" }]).filter(
      (x) => x.kind === "factura",
    );
    expect(again?.key).not.toBe(f?.key);
  });

  it("busca pedidos por número, cliente o ciudad (sin tildes) y productos por nombre", () => {
    expect(searchAll("1002", orders, products).orders.map((o) => o.number)).toEqual(["MG-1002"]);
    expect(searchAll("mendez", orders, products).orders.map((o) => o.number)).toEqual(["MG-1002"]);
    expect(searchAll("rosario", orders, products).orders).toHaveLength(1);
    expect(searchAll("samanta", orders, products).products.map((p) => p.slug)).toEqual(["samanta"]);
    expect(searchAll("  ", orders, products)).toEqual({ orders: [], customers: [], products: [] });
  });

  it("busca clientes por nombre o mail, sin acentos", () => {
    const customers = [
      { email: "lucia@ejemplo.com", name: "Lucía Fernández", city: "CABA" },
      { email: "sofi.mendez@ejemplo.com", name: "Sofía Méndez", city: "Rosario" },
    ] as AdminCustomer[];
    expect(searchAll("lucia", orders, products, customers).customers.map((c) => c.email)).toEqual([
      "lucia@ejemplo.com",
    ]);
    expect(searchAll("sofi.mendez@", orders, products, customers).customers).toHaveLength(1);
    expect(searchAll("lucia", orders, products).customers).toEqual([]);
  });
});

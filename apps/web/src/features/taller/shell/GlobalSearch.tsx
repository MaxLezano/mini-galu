"use client";

import { type AdminOrderSummary, type AdminProduct, formatARS, ORDER_STATUSES } from "@mini-galu/contracts";
import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cover } from "@/lib/product";
import { searchAll } from "./shell-view";

type Props = {
  orders: AdminOrderSummary[] | null;
  products: AdminProduct[] | null;
  onOrder: (number: string) => void;
  onProduct: (slug: string) => void;
};

/** Búsqueda global (tecla "/") — admin.js: pedidos por número, cliente o ciudad, y productos. */
export function GlobalSearch({ orders, products, onOrder, onProduct }: Props) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName ?? "").toLowerCase();
      if (e.key === "/" && !["input", "textarea", "select"].includes(tag)) {
        e.preventDefault();
        input.current?.focus();
      }
      if (e.key === "Escape") setOpen(false);
    };
    const onClick = (e: MouseEvent) => !(e.target as Element).closest(".adm-search") && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
    };
  }, []);
  const hits = searchAll(q, orders ?? [], products ?? []);
  const done = () => {
    setOpen(false);
    setQ("");
  };

  return (
    <div className="adm-search">
      <span>
        <Search className="i-sm" />
      </span>
      <input
        ref={input}
        id="gsearch"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        placeholder="Buscar pedido, cliente o prenda…"
        autoComplete="off"
        aria-label="Buscar"
      />
      <kbd>/</kbd>
      <div className={`search-pop ${open && q.trim() ? "is-open" : ""}`} id="search-pop">
        {hits.orders.length > 0 && <h6>Pedidos</h6>}
        {hits.orders.map((o) => (
          <button
            key={o.number}
            type="button"
            onClick={() => {
              done();
              onOrder(o.number);
            }}
          >
            <span>
              <b>#{o.number}</b> · {o.customer.name}
            </span>
            <span className={`pill-status ${ORDER_STATUSES[o.status].tone}`} style={{ marginLeft: "auto" }}>
              {ORDER_STATUSES[o.status].short}
            </span>
          </button>
        ))}
        {hits.products.length > 0 && <h6>Productos</h6>}
        {hits.products.map((p) => (
          <button
            key={p.slug}
            type="button"
            onClick={() => {
              done();
              onProduct(p.slug);
            }}
          >
            {p.images[0] && <img src={cover(p)} alt="" />}
            {p.name}
            <span className="muted" style={{ marginLeft: "auto" }}>
              {formatARS(p.priceCents)}
            </span>
          </button>
        ))}
        {!hits.orders.length && !hits.products.length && (
          <p className="muted" style={{ padding: 10, margin: 0, fontSize: 13.5 }}>
            {orders && products ? `Sin resultados para “${q.trim()}”.` : "Buscando…"}
          </p>
        )}
      </div>
    </div>
  );
}

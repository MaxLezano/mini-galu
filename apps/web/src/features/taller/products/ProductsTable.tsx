import { type AdminProduct, formatARS } from "@mini-galu/contracts";
import { BellRing, Pencil } from "lucide-react";
import { cover } from "@/lib/product";
import { stockLevel, totalWaiting } from "./products-view";

type Props = {
  products: AdminProduct[];
  busySlug: string | null;
  onEdit: (p: AdminProduct) => void;
  onTogglePublish: (p: AdminProduct, published: boolean) => void;
};

/** Presentacional: tabla de productos (mockup admin-productos.html → #prods). */
export function ProductsTable({ products, busySlug, onEdit, onTogglePublish }: Props) {
  return (
    <div className="tbl-wrap">
      <table className="t stack">
        <thead>
          <tr>
            <th>Producto</th>
            <th>Colección</th>
            <th>Talles</th>
            <th>Stock</th>
            <th className="num">Precio</th>
            <th className="num">Vendidas</th>
            <th>Lista de espera</th>
            <th>Publicado</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {products.length === 0 && (
            <tr className="empty-row">
              <td colSpan={9}>No hay productos con ese filtro.</td>
            </tr>
          )}
          {products.map((p) => {
            const total = p.variants.reduce((a, v) => a + v.stock, 0);
            const lvl = stockLevel(p);
            const outs = p.variants.filter((v) => v.stock === 0).length;
            const waiting = totalWaiting(p);
            const draft = p.status === "draft";
            return (
              <tr
                key={p.slug}
                className="clickable"
                onClick={(e) => !(e.target as Element).closest("input, button") && onEdit(p)}
              >
                <td className="full">
                  <div className="pp">
                    {p.images[0] ? (
                      <img src={cover(p)} alt="" />
                    ) : (
                      <span className="sz" style={{ width: 40, aspectRatio: "3/4" }} />
                    )}
                    <div>
                      <b>{p.name}</b>
                      <small>
                        {p.color.name} · {p.fabric}
                      </small>
                    </div>
                  </div>
                </td>
                <td className="hide-s">{p.collection.name}</td>
                <td data-l="Talles">
                  <div className="szs">
                    {p.variants.map((v) => (
                      <span
                        key={v.size}
                        className={`sz ${v.stock === 0 ? "out" : ""}`}
                        title={v.stock ? `${v.stock} en stock` : "agotado"}
                      >
                        {v.size}
                      </span>
                    ))}
                  </div>
                </td>
                <td data-l="Stock">
                  <div className={`stock-cell ${lvl === "out" || lvl === "draft" ? "out" : lvl}`}>
                    <div className="row">
                      <b>{total}</b>
                      <span className="muted" style={{ fontSize: 12 }}>
                        {total === 1 ? "unidad" : "unidades"}
                      </span>
                      {!draft && lvl === "low" && <span className="pill-status st-warn">Bajo</span>}
                      {!draft && total === 0 && <span className="pill-status st-rose">Sin stock</span>}
                    </div>
                    <div className="bar">
                      <i style={{ width: `${Math.min(100, (total / 10) * 100)}%` }} />
                    </div>
                    {outs > 0 && !draft && (
                      <span className="stock-note">
                        {outs} {outs === 1 ? "talle agotado" : "talles agotados"}
                      </span>
                    )}
                  </div>
                </td>
                <td className="num" data-l="Precio">
                  {formatARS(p.priceCents)}
                  {p.compareAtCents && (
                    <div className="muted" style={{ fontSize: 11.5, textDecoration: "line-through" }}>
                      {formatARS(p.compareAtCents)}
                    </div>
                  )}
                </td>
                <td className="num hide-s">{p.unitsSold}</td>
                <td data-l="Esperando">
                  {waiting ? (
                    <span className="wl">
                      <BellRing className="i-sm" />
                      <b>{waiting}</b>{" "}
                      <span className="muted">
                        · {p.waitlist.map((w) => (w.size ? `T${w.size}` : "al salir")).join(", ")}
                      </span>
                    </span>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
                <td data-l="Publicado">
                  <input
                    className="tog"
                    type="checkbox"
                    checked={!draft}
                    disabled={busySlug === p.slug}
                    aria-label={`Publicado: ${p.name}`}
                    onChange={(e) => onTogglePublish(p, e.target.checked)}
                  />
                </td>
                <td>
                  <button type="button" className="icon-btn" aria-label={`Editar ${p.name}`} onClick={() => onEdit(p)}>
                    <Pencil className="i-sm" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

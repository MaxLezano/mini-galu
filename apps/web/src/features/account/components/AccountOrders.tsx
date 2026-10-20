import { type AccountOrder, formatARS, imageThumb, ORDER_STATUSES, type OrderStatus } from "@mini-galu/contracts";
import { Star } from "lucide-react";
import Link from "next/link";
import { shortDate } from "@/lib/date";
import { Embroidery } from "@/ui/atoms/Embroidery";

/** "Tus pedidos" — cuenta.html → #orders */
export function AccountOrders({ orders }: { orders: AccountOrder[] }) {
  if (!orders.length)
    return (
      <div className="empty-state">
        <Embroidery />
        <div className="hand" style={{ fontSize: 32 }}>
          Todavía no hay pedidos
        </div>
        <Link className="btn" href="/catalogo">
          Ver catálogo
        </Link>
      </div>
    );
  return (
    <div className="orders" id="orders">
      {orders.map((o) => {
        const st = ORDER_STATUSES[o.status as OrderStatus] ?? ORDER_STATUSES.nuevo;
        const units = o.items.reduce((a, i) => a + i.qty, 0);
        return (
          <div className="order" key={o.number}>
            <div className="ph">
              {o.items.slice(0, 3).map((i) => (
                <img loading="lazy" key={`${i.slug}-${i.size}`} src={imageThumb(i.imageUrl)} alt="" />
              ))}
            </div>
            <div>
              <b>#{o.number}</b>
              <div className="muted" style={{ fontSize: 13 }}>
                {shortDate(o.createdAt)} · {units} {units === 1 ? "prenda" : "prendas"} · {formatARS(o.totalCents)}
              </div>
            </div>
            <span className={`pill-status ${st.tone}`}>{st.short}</span>
            {o.status === "entregado" && o.items[0] ? (
              <div className="order-actions">
                {o.reviewPath && (
                  <Link className="btn btn-sm" href={o.reviewPath}>
                    <Star className="i-sm" /> Dejar reseña
                  </Link>
                )}
                <Link className="btn btn-sm btn-ghost" href={`/producto/${o.items[0].slug}`}>
                  Volver a comprar
                </Link>
              </div>
            ) : (
              <Link className="btn btn-sm btn-ghost" href={`/seguimiento?pedido=${o.number}`}>
                Seguir
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
}

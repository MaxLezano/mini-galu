import type { ReviewableOrder } from "@mini-galu/contracts";
import Link from "next/link";
import { Embroidery } from "@/ui/atoms/Embroidery";
import { ReviewItem } from "./containers/ReviewItem";
import "./reviews.css";

/** "¿Cómo le quedó?" — el cliente reseña cada prenda de su pedido (link del mail y de Mi cuenta). Sin mockup. */
export function ReviewPage({ order, token }: { order: ReviewableOrder; token: string }) {
  return (
    <main className="wrap rv-page">
      <header className="rv-hero">
        <span className="eyebrow">Pedido #{order.number}</span>
        <h1 className="display h1">
          ¿Cómo le <em>quedó</em>?
        </h1>
        <p className="lead">
          Hola {order.firstName}: contanos qué te pareció cada prenda. Tu reseña ayuda a otras familias a elegir ♡
        </p>
      </header>
      {order.delivered ? (
        <div className="rv-items">
          {order.items.map((i) => (
            <ReviewItem key={i.id} item={i} number={order.number} token={token} author={order.author} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <Embroidery />
          <div className="hand" style={{ fontSize: 32 }}>
            Cuando te llegue, nos contás
          </div>
          <Link className="btn" href={`/seguimiento?pedido=${order.number}`}>
            Seguir el pedido
          </Link>
        </div>
      )}
    </main>
  );
}

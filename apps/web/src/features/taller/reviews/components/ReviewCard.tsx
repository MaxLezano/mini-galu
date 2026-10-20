import { type AdminReview, imageThumb } from "@mini-galu/contracts";
import { Check, EyeOff, House } from "lucide-react";
import Link from "next/link";
import { shortDate } from "@/lib/date";
import { Stars } from "@/ui/atoms/Stars";

const FIT = { justo: "Talle justo", grande: "Le quedó grande", chico: "Le quedó chico" } as const;

type Props = {
  review: AdminReview;
  busy: boolean;
  onPublish: () => void;
  onHide: () => void;
  onFeature: (on: boolean) => void;
};

/** Una reseña en el panel: lo que escribió, la foto, de qué pedido salió y qué hacer con ella. */
export function ReviewCard({ review: r, busy, onPublish, onHide, onFeature }: Props) {
  return (
    <article className="adm-rv" aria-label={`Reseña de ${r.author}`}>
      {r.photoUrl ? (
        <a href={r.photoUrl} target="_blank" rel="noreferrer">
          <img src={imageThumb(r.photoUrl)} alt={`Foto de ${r.author}`} loading="lazy" />
        </a>
      ) : r.product.imageUrl ? (
        <img className="is-product" src={imageThumb(r.product.imageUrl)} alt="" loading="lazy" />
      ) : (
        <span />
      )}
      <div className="adm-rv-body">
        <div className="adm-rv-top">
          <Stars n={r.rating} />
          {r.featured && (
            <span className="pill-status st-rose">
              <House className="i-sm" /> En el inicio
            </span>
          )}
        </div>
        {r.title && <b>{r.title}</b>}
        <p>{r.body}</p>
        <div className="adm-rv-meta muted">
          <span>
            <b>{r.author}</b>
            {r.city ? ` · ${r.city}` : ""}
          </span>
          <Link href={`/producto/${r.product.slug}`} target="_blank">
            {r.product.name}
            {r.size ? ` · talle ${r.size}` : ""}
          </Link>
          {r.fit && <span>{FIT[r.fit]}</span>}
          {r.orderNumber && <Link href={`/taller/pedidos?pedido=${r.orderNumber}`}>#{r.orderNumber}</Link>}
          <span>{shortDate(r.createdAt)}</span>
        </div>
      </div>
      <div className="adm-rv-actions">
        {r.status !== "publicada" && (
          <button type="button" className="btn btn-sm" disabled={busy} onClick={onPublish}>
            <Check className="i-sm" /> Publicar
          </button>
        )}
        {r.status === "publicada" && (
          <button
            type="button"
            className="chip"
            aria-pressed={r.featured}
            disabled={busy}
            onClick={() => onFeature(!r.featured)}
          >
            <House className="i-sm" /> Mostrar en el inicio
          </button>
        )}
        {r.status !== "oculta" && (
          <button type="button" className="btn btn-sm btn-ghost" disabled={busy} onClick={onHide}>
            <EyeOff className="i-sm" /> Ocultar
          </button>
        )}
      </div>
    </article>
  );
}

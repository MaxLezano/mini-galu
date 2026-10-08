import { discountPercent, formatARS, installment, type ProductSummary, type Size } from "@mini-galu/contracts";
import { Heart, ShoppingBag } from "lucide-react";
import Link from "next/link";
import type { CSSProperties } from "react";
import { cover, totalStock } from "@/lib/product";

export type ProductCardProps = {
  product: ProductSummary;
  isFavorite: boolean;
  /** Cuotas sin interés confirmadas por Mercado Pago para este precio (1 = ninguna: no se muestra nada). */
  interestFree?: number;
  /** Tarjeta en arco (carrusel de la home). */
  arch?: boolean;
  /** Posición en la grilla, para escalonar la entrada. */
  index?: number;
  reveal?: boolean;
  quickOpen?: boolean;
  className?: string;
  style?: CSSProperties;
  onToggleFavorite: (button: HTMLButtonElement) => void;
  onQuickToggle: () => void;
  onAdd: (size: Size, image: HTMLImageElement | null) => void;
};

/** Presentacional: misma estructura y clases que `card()` en design/mockups/assets/js/app.js. */
export function ProductCard({
  product: p,
  isFavorite,
  interestFree = 1,
  arch,
  index = 0,
  reveal = true,
  quickOpen,
  className = "",
  style,
  onToggleFavorite,
  onQuickToggle,
  onAdd,
}: ProductCardProps) {
  const total = totalStock(p);
  const off = discountPercent(p.priceCents, p.compareAtCents);
  const tag = off ? (
    <span className="label-tag is-sale">-{off}%</span>
  ) : total > 0 && total <= 2 ? (
    <span className="label-tag is-last">Últimas</span>
  ) : p.tag ? (
    <span className="label-tag">{p.tag}</span>
  ) : null;
  const href = `/producto/${p.slug}`;
  const second = p.images[1];

  return (
    <article
      className={`p-card ${arch ? "arch" : ""} ${quickOpen ? "is-quick" : ""} ${className}`.trim()}
      data-reveal={reveal ? "" : undefined}
      style={{ "--d": `${(index % 4) * 0.07}s`, ...style } as CSSProperties}
    >
      <div className="p-frame">
        <Link className="p-media" href={href} aria-label={p.name}>
          <img src={cover(p)} alt={p.name} loading="lazy" />
          {second && <img className="alt" src={second.url} alt="" loading="lazy" />}
        </Link>
        <div className="tags">{tag}</div>
        <button
          type="button"
          className={`fav ${isFavorite ? "is-on" : ""}`}
          aria-label="Guardar en favoritos"
          aria-pressed={isFavorite}
          onClick={(e) => onToggleFavorite(e.currentTarget)}
        >
          <Heart className="i-sm" />
        </button>
        <button type="button" className="quick-toggle" aria-label="Agregar rápido" onClick={onQuickToggle}>
          <ShoppingBag className="i-sm" />
        </button>
        <div className="p-quick">
          <small>Agregar talle</small>
          {p.variants.map((v) => (
            <button
              type="button"
              key={v.size}
              className={`size-dot ${v.stock ? "" : "is-out"}`}
              aria-label={`Agregar talle ${v.size}`}
              disabled={!v.stock}
              onClick={(e) => onAdd(v.size, e.currentTarget.closest(".p-card")?.querySelector(".p-media img") ?? null)}
            >
              {v.size}
            </button>
          ))}
        </div>
      </div>
      <div className="p-info">
        <div>
          <h3 className="p-name">
            <Link href={href}>{p.name}</Link>
          </h3>
          <div className="p-meta">
            <span className="swatch" style={{ background: p.color.hex }} />
            {p.collection.name}
          </div>
        </div>
        <div className="price">
          {p.compareAtCents && <s>{formatARS(p.compareAtCents)}</s>}
          {formatARS(p.priceCents)}
          {interestFree > 1 && (
            <small>
              {interestFree} × {formatARS(installment(p.priceCents, interestFree))} sin interés
            </small>
          )}
        </div>
      </div>
    </article>
  );
}

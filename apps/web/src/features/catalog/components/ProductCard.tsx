import { discountPercent, formatARS, installment, type ProductSummary, type Size } from "@mini-galu/contracts";
import { Check, Heart, ShoppingBag } from "lucide-react";
import Link from "next/link";
import type { CSSProperties } from "react";
import { cover, totalStock } from "@/lib/product";
import { Picture } from "@/ui/atoms/Picture";

/** Modo lista de cumple (catalogo.html?lista=…): la tarjeta se elige con un toque, con su talle. */
export type CardPick = {
  /** Ya está en la lista de la nena: no se puede volver a elegir. */
  inList: boolean;
  picked: boolean;
  size: string;
  onToggle: () => void;
  onSize: (size: string) => void;
};

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
  pick?: CardPick;
  onToggleFavorite: (button: HTMLButtonElement) => void;
  onQuickToggle: () => void;
  onAdd: (size: Size, image: HTMLImageElement | null) => void;
};

/** Ancho de la tarjeta: 2 columnas en el celular, 3 en escritorio (más en pantallas grandes). */
const CARD_SIZES = "(max-width: 700px) 50vw, (max-width: 1800px) 30vw, 20vw";

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
  pick,
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
  const pickState = pick ? `pickable ${pick.picked ? "is-picked" : ""} ${pick.inList ? "in-list" : ""}` : "";

  return (
    <article
      className={`p-card ${arch ? "arch" : ""} ${quickOpen ? "is-quick" : ""} ${pickState} ${className}`
        .replace(/\s+/g, " ")
        .trim()}
      data-reveal={reveal ? "" : undefined}
      style={{ "--d": `${(index % 4) * 0.07}s`, ...style } as CSSProperties}
      // en captura: el toque elige la prenda en vez de abrir la ficha (Link no navega si ya se hizo preventDefault)
      onClickCapture={
        pick && !pick.inList
          ? (e) => {
              if ((e.target as HTMLElement).closest(".pick-size, .fav")) return;
              e.preventDefault();
              pick.onToggle();
            }
          : undefined
      }
    >
      <div className="p-frame">
        <Link className="p-media" href={href} aria-label={p.name}>
          <Picture src={cover(p)} alt={p.name} loading="lazy" sizes={CARD_SIZES} />
          {second && <Picture className="alt" src={second.url} alt="" loading="lazy" sizes={CARD_SIZES} />}
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
        {pick &&
          (pick.inList ? (
            <span className="pick-in">
              <Check className="i-sm" /> Ya está en la lista
            </span>
          ) : (
            <>
              <button type="button" className="pick-btn" aria-pressed={pick.picked} aria-label={`Elegir ${p.name}`}>
                <Check className="i-sm" />
              </button>
              <label className="pick-size">
                Talle{" "}
                <select value={pick.size} onChange={(e) => pick.onSize(e.target.value)}>
                  {p.variants.map((v) => (
                    <option key={v.size}>{v.size}</option>
                  ))}
                </select>
              </label>
            </>
          ))}
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

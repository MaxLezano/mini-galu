"use client";

import { type AccountChild, formatARS } from "@mini-galu/contracts";
import { Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { BrandIcon } from "@/ui/atoms/BrandIcon";
import { Embroidery } from "@/ui/atoms/Embroidery";
import { birthdayLabel } from "../account-view";

type Props = {
  nenas: AccountChild[];
  selected: AccountChild | null;
  /** Origen de la tienda (para armar el link para compartir). */
  origin: string;
  onSelect: (id: string) => void;
  onRemove: (itemId: string) => void;
  onAddNena: () => void;
  onCopy: (url: string) => void;
};

/** Lista de cumple — cuenta.html → #p-lista */
export function WishlistPanel({ nenas, selected, origin, onSelect, onRemove, onAddNena, onCopy }: Props) {
  const url = selected ? `${origin}/lista/${selected.wishSlug}` : "";
  return (
    <>
      <div className="panel-head">
        <span className="eyebrow is-in">Lista de cumple</span>
        <h1 className="display h2">
          {selected ? (
            <>
              El cumple de <em>{selected.name}</em>
            </>
          ) : (
            <>
              Tu lista de <em>cumple</em>
            </>
          )}
        </h1>
        <p className="lead" style={{ margin: 0 }}>
          Armá una lista con lo que le gusta y compartila con la familia. Cuando alguien compra algo, se marca como
          regalado para que no se repita.
        </p>
      </div>
      {!selected ? (
        <div className="wish-empty empty-state">
          <Embroidery />
          <div className="hand" style={{ fontSize: 34 }}>
            Primero sumá a tu nena
          </div>
          <p className="muted" style={{ margin: "0 0 8px", maxWidth: "44ch" }}>
            La lista de cumple se arma para una nena: con su talle y su cumple, la familia sabe qué regalarle.
          </p>
          <button type="button" className="btn" onClick={onAddNena}>
            <Plus className="i-sm" /> Agregar nena
          </button>
        </div>
      ) : (
        <>
          {nenas.length > 1 && (
            <div className="wish-nenas">
              {nenas.map((n) => (
                <button
                  type="button"
                  key={n.id}
                  className="chip"
                  aria-pressed={n.id === selected.id}
                  onClick={() => onSelect(n.id)}
                >
                  {n.name}
                </button>
              ))}
            </div>
          )}
          <div className="wish">
            <div className="wish-list" id="wish">
              {selected.wishlist.length ? (
                selected.wishlist.map((w) => (
                  <div className="wish-item" key={w.id}>
                    {w.imageUrl ? <img src={w.imageUrl} alt="" /> : <span />}
                    <div>
                      <b>{w.name}</b>
                      <span className="muted" style={{ fontSize: 13 }}>
                        Talle {w.size} · {formatARS(w.priceCents)}
                        {w.giftedBy ? ` · ${w.giftedBy}` : ""}
                      </span>
                    </div>
                    <div className="wish-st">
                      {w.gifted ? (
                        <span className="pill-status st-ok">Regalado</span>
                      ) : (
                        <>
                          <span className="pill-status st-muted">Disponible</span>
                          <button
                            type="button"
                            className="icon-btn"
                            aria-label={`Quitar ${w.name} de la lista`}
                            onClick={() => onRemove(w.id)}
                          >
                            <Trash2 className="i-sm" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="wish-none">
                  <Embroidery />
                  <div className="hand" style={{ fontSize: 28 }}>
                    La lista de {selected.name} está vacía
                  </div>
                  <p className="muted" style={{ margin: 0 }}>
                    Sumá lo que le gusta desde cada prenda: la familia lo ve y compra sin repetir.
                  </p>
                </div>
              )}
              <div className="wish-actions">
                {/* modo lista del catálogo: se eligen varias y se suman juntas */}
                <Link className="btn" href={`/catalogo?lista=${selected.wishSlug}`}>
                  <Plus className="i-sm" /> Agregar prendas
                </Link>
                {selected.size && (
                  <Link className="link" href={`/catalogo?talle=${selected.size}&lista=${selected.wishSlug}`}>
                    Ver todo en talle {selected.size}
                  </Link>
                )}
              </div>
            </div>
            <div className="wish-share">
              <span className="eyebrow" style={{ color: "var(--rosa)" }}>
                Compartir
              </span>
              {selected.birthday && (
                <p className="display h3" style={{ margin: 0 }}>
                  Cumple el <em>{birthdayLabel(selected.birthday)}</em>
                </p>
              )}
              <div className="share-link">
                <span>{url.replace(/^https?:\/\//, "")}</span>
                <button type="button" className="btn btn-xs btn-light" onClick={() => onCopy(url)}>
                  Copiar
                </button>
              </div>
              <a
                className="btn btn-rose"
                target="_blank"
                rel="noopener"
                href={`https://wa.me/?text=${encodeURIComponent(`¡Hola! Esta es la lista de cumple de ${selected.name}: ${url}`)}`}
              >
                <BrandIcon name="whatsapp" className="i-sm" /> Mandar por WhatsApp
              </a>
              <span style={{ fontSize: 12.5, opacity: 0.7 }}>
                Quien la abre puede comprar sin crear cuenta. Vos no ves quién regaló qué hasta el cumple.
              </span>
            </div>
          </div>
        </>
      )}
    </>
  );
}

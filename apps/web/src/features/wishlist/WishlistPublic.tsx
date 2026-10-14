"use client";

import { formatARS, type ProductSummary, type PublicWishlist, type Size } from "@mini-galu/contracts";
import { Gift } from "lucide-react";
import Link from "next/link";
import { useAddToCart } from "@/features/cart/use-add-to-cart";
import { useUi } from "@/features/shell/ui-store";
import { Embroidery } from "@/ui/atoms/Embroidery";
import { birthdayLabel } from "../account/account-view";
import { useGifts } from "./gift-store";
import "./wishlist.css";

type Props = { slug: string; list: PublicWishlist; products: ProductSummary[] };

/**
 * Lista de cumple que comparte la familia (sin cuenta). "Lo regalo yo" la suma a la bolsa; al pagarse, queda
 * regalada para que nadie la repita.
 */
export function WishlistPublic({ slug, list, products }: Props) {
  const addToCart = useAddToCart();
  const pick = useGifts((s) => s.pick);
  const picked = useGifts((s) => s.picks);
  const setDrawer = useUi((s) => s.setDrawer);
  const bySlug = new Map(products.map((p) => [p.slug, p]));

  return (
    <main className="wrap wl">
      <div className="wl-head">
        <span className="eyebrow is-in">Lista de cumple</span>
        <h1 className="display h2">
          El cumple de <em>{list.name}</em>
        </h1>
        {list.birthday && <p className="hand wl-date">cumple el {birthdayLabel(list.birthday)} ♡</p>}
        <p className="lead" style={{ margin: 0 }}>
          Elegí lo que le quieras regalar: cuando se paga, queda marcado para que nadie lo repita. No hace falta crear
          cuenta.
        </p>
      </div>

      {list.items.length ? (
        <div className="wl-items">
          {list.items.map((i) => {
            const p = bySlug.get(i.slug);
            const mine = picked.some((g) => g.itemId === i.id);
            return (
              <article className={`wl-item ${i.gifted ? "is-gifted" : ""}`} key={i.id} data-wish={i.slug}>
                <Link href={`/producto/${i.slug}`}>{i.imageUrl && <img src={i.imageUrl} alt="" />}</Link>
                <div>
                  <b>{i.name}</b>
                  <span className="muted">
                    Talle {i.size} · {formatARS(i.priceCents)}
                  </span>
                </div>
                {i.gifted ? (
                  <span className="pill-status st-ok">Ya se lo regalaron ♡</span>
                ) : !i.inStock || !p ? (
                  <span className="pill-status st-muted">Sin stock en ese talle</span>
                ) : mine ? (
                  <button type="button" className="btn btn-sm btn-ghost" onClick={() => setDrawer(true)}>
                    En tu bolsa
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={(e) => {
                      pick({ itemId: i.id, slug: i.slug, size: i.size, list: slug });
                      addToCart(p, i.size as Size, {
                        from: e.currentTarget.closest("article")?.querySelector("img") ?? null,
                      });
                    }}
                  >
                    <Gift className="i-sm" /> Lo regalo yo
                  </button>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          <Embroidery />
          <div className="hand" style={{ fontSize: 30 }}>
            La lista todavía está vacía
          </div>
          <Link className="btn" href="/catalogo">
            Ver catálogo
          </Link>
        </div>
      )}
    </main>
  );
}

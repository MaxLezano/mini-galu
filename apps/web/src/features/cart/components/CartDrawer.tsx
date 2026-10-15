"use client";

import { FREE_SHIPPING_FROM_CENTS, formatARS, imageThumb } from "@mini-galu/contracts";
import { ArrowRight, Minus, Plus, Truck, X } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { toast, useUi } from "@/features/shell/ui-store";
import { BrandIcon } from "@/ui/atoms/BrandIcon";
import { Embroidery } from "@/ui/atoms/Embroidery";
import { cartTotal, useCart } from "../cart-store";

export function CartDrawer() {
  const { drawerOpen, setDrawer } = useUi();
  const { lines, setQty, remove } = useCart();
  const total = cartTotal(lines);
  const left = FREE_SHIPPING_FROM_CENTS - total;
  const close = () => setDrawer(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawer(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [setDrawer]);

  return (
    <>
      <button
        type="button"
        tabIndex={-1}
        aria-label="Cerrar bolsa"
        className={`scrim ${drawerOpen ? "is-open" : ""}`}
        id="scrim"
        onClick={close}
      />
      <aside
        className={`drawer ${drawerOpen ? "is-open" : ""}`}
        id="drawer"
        aria-label="Tu bolsa"
        aria-hidden={!drawerOpen}
      >
        <div className="drawer-head">
          <h2 className="display h3">
            Tu <em>bolsa</em>
          </h2>
          <button type="button" className="icon-btn" aria-label="Cerrar" onClick={close}>
            <X />
          </button>
        </div>
        {lines.length > 0 && (
          <div style={{ padding: "16px 24px 0" }} className="ship-progress">
            <span>
              {left > 0 ? (
                <>
                  Te faltan <b>{formatARS(left)}</b> para el <b>envío gratis</b>
                </>
              ) : (
                <>
                  ¡Tenés <b>envío gratis</b> con Andreani!
                </>
              )}
            </span>
            <div className="bar">
              <i style={{ width: `${Math.min(100, (total / FREE_SHIPPING_FROM_CENTS) * 100)}%` }} />
            </div>
          </div>
        )}
        <div className="drawer-body">
          {lines.length ? (
            lines.map((l, i) => (
              <div className="line-item" key={`${l.slug}-${l.size}`}>
                <Link href={`/producto/${l.slug}`} onClick={close}>
                  <img loading="lazy" src={imageThumb(l.imageUrl)} alt={l.name} />
                </Link>
                <div>
                  <h4>{l.name}</h4>
                  <div className="muted" style={{ fontSize: 13 }}>
                    Talle {l.size} · {l.colorName}
                  </div>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <div className="qty">
                      <button type="button" aria-label="Menos" onClick={() => setQty(i, l.qty - 1)}>
                        <Minus className="i-sm" />
                      </button>
                      <span>{l.qty}</span>
                      <button
                        type="button"
                        aria-label="Más"
                        onClick={() => !setQty(i, l.qty + 1).ok && toast(`No hay más stock en talle ${l.size}`)}
                      >
                        <Plus className="i-sm" />
                      </button>
                    </div>
                    <button type="button" className="rm" onClick={() => remove(i)}>
                      Quitar
                    </button>
                  </div>
                </div>
                <b>{formatARS(l.priceCents * l.qty)}</b>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <Embroidery />
              <div className="hand" style={{ fontSize: 32 }}>
                Tu bolsa está vacía
              </div>
              <p className="muted" style={{ margin: "0 0 8px" }}>
                Pero el taller está lleno de cosas lindas.
              </p>
              <Link className="btn" href="/catalogo" onClick={close}>
                Ver catálogo
              </Link>
            </div>
          )}
        </div>
        {lines.length > 0 && (
          <div className="drawer-foot">
            <div className="row">
              <span className="muted">Subtotal</span>
              <b style={{ fontSize: 20 }}>{formatARS(total)}</b>
            </div>
            <Link className="btn btn-block" href="/checkout" onClick={close}>
              Ir a pagar <ArrowRight />
            </Link>
            <div className="row muted" style={{ fontSize: 12, justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
              <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                <BrandIcon name="mercadopago" className="i-sm" /> Pago seguro con Mercado Pago
              </span>
              <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                <Truck className="i-sm" /> Andreani
              </span>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}

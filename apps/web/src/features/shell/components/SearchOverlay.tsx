"use client";

import { formatARS, type ProductSummary } from "@mini-galu/contracts";
import { ArrowRight, MessageCircleHeart, Search, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { cover, sizesIn, stockOf, stripAccents, totalStock } from "@/lib/product";
import { useShellData } from "../shell-context";
import { useUi } from "../ui-store";

const SUGGESTIONS = ["vestido rojo", "bautismo", "plumeti", "talle 6", "moño", "lino"];
const SIZE_RE = /talle\s*(12\s*m\b|\d{1,2})/;

/** Mismo criterio que api/catalog/domain → matchesSearch, sobre los productos ya cargados (resultados en vivo). */
function search(products: ProductSummary[], raw: string): ProductSummary[] {
  const q = stripAccents(raw.trim());
  if (!q) return products.filter((p) => p.tag === "Nuevo" || p.unitsSold > 6).slice(0, 4);
  const size = q.match(SIZE_RE)?.[1]?.replace(/\s/g, "");
  const words = q
    .replace(SIZE_RE, "")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.replace(/(es|s)$/, ""));
  return products
    .filter((p) => {
      const hay = stripAccents(
        `${p.name} ${p.description} ${p.fabric} ${p.color.name} ${p.occasions.join(" ")} ${p.collection.name}`,
      );
      return words.every((w) => hay.includes(w)) && (!size || stockOf(p, size as never) > 0);
    })
    .slice(0, 6);
}

export function SearchOverlay() {
  const { products } = useShellData();
  const { searchOpen, setSearch, openGalu } = useUi();
  const router = useRouter();
  const [q, setQ] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const list = useMemo(() => search(products, q), [products, q]);

  useEffect(() => {
    if (searchOpen) setTimeout(() => input.current?.focus(), 80);
    document.body.classList.toggle("search-open", searchOpen);
  }, [searchOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSearch(false);
      const tag = (document.activeElement?.tagName ?? "").toLowerCase();
      if (e.key === "/" && !["input", "textarea", "select"].includes(tag)) {
        e.preventDefault();
        setSearch(true);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [setSearch]);

  const close = () => setSearch(false);
  const head = q.trim()
    ? list.length
      ? `${list.length} ${list.length === 1 ? "prenda" : "prendas"}`
      : "Nada con eso todavía"
    : "Lo nuevo y lo más vendido";

  return (
    <div
      className={`search-ov ${searchOpen ? "is-open" : ""}`}
      id="search-ov"
      role="dialog"
      aria-label="Buscar"
      aria-hidden={!searchOpen}
      onClick={(e) => e.target === e.currentTarget && close()}
    >
      <div className="so-sheet">
        <div className="wrap">
          <form
            className="so-form"
            onSubmit={(e) => {
              e.preventDefault();
              close();
              router.push(`/catalogo?q=${encodeURIComponent(q)}`);
            }}
          >
            <Search />
            <input
              ref={input}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              type="search"
              autoComplete="off"
              placeholder="¿Qué estás buscando?"
              aria-label="Buscar en la tienda"
            />
            <kbd>esc</kbd>
            <button type="button" className="icon-btn" aria-label="Cerrar" onClick={close}>
              <X />
            </button>
          </form>
          <div className="so-sugs">
            <span className="eyebrow is-in">Lo más buscado</span>
            <div>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="chip"
                  onClick={() => {
                    setQ(s);
                    input.current?.focus();
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="so-res">
            <div className="so-head">
              <span className="eyebrow is-in">{head}</span>
              {q.trim() && list.length > 0 && (
                <Link className="link" href={`/catalogo?q=${encodeURIComponent(q)}`} onClick={close}>
                  Ver todo en el catálogo <ArrowRight className="i-sm" />
                </Link>
              )}
            </div>
            {list.length ? (
              <div className="so-grid">
                {list.map((p) => {
                  const st = totalStock(p);
                  const av = sizesIn(p);
                  return (
                    <Link key={p.slug} className="so-item" href={`/producto/${p.slug}`} onClick={close}>
                      <img src={cover(p)} alt="" loading="lazy" />
                      <span>
                        <b>{p.name}</b>
                        <small>{formatARS(p.priceCents)}</small>
                        <small className={st ? "ok" : "out"}>
                          {st ? (av.length > 1 ? `Talles ${av.join(" · ")}` : "En stock") : "Sin stock · avisame"}
                        </small>
                      </span>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="so-empty">
                <span className="hand">mmm…</span>
                <p className="muted">Probá con otra palabra o preguntale a Galú: sabe todo lo que hay en el taller.</p>
                <button type="button" className="btn btn-sm btn-rose" onClick={() => openGalu(q)}>
                  <MessageCircleHeart className="i-sm" /> Preguntale a Galú
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

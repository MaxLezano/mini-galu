"use client";

import { type Collection, formatARS, OCCASIONS, type ProductSummary } from "@mini-galu/contracts";
import {
  BellRing,
  Image as ImageIcon,
  LayoutGrid,
  MessageCircleHeart,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import Link from "next/link";
import { type CSSProperties, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { OpenGaluButton } from "@/features/assistant/components/OpenGaluButton";
import { isStill } from "@/features/shell/craft";
import { toast } from "@/features/shell/ui-store";
import { api } from "@/lib/api";
import { Embroidery } from "@/ui/atoms/Embroidery";
import { Foco } from "@/ui/atoms/Foco";
import { activeFilterCount, type CatalogState, toQuery, toUrl } from "../catalog-state";
import { CatalogFilters } from "../components/CatalogFilters";
import { ProductCardContainer } from "./ProductCardContainer";

type Props = {
  initial: CatalogState;
  initialProducts: ProductSummary[];
  collections: Collection[];
  colors: { name: string; hex: string }[];
  priceRange: { minCents: number; maxCents: number };
};

const EMPTY = { sizes: [], occ: [], colors: [], max: null, q: "", instock: true } satisfies Partial<CatalogState>;

/** Las transiciones de vista acompañan cada cambio de filtro (si el navegador las soporta). */
function withTransition(fn: () => void) {
  const doc = document as Document & {
    startViewTransition?: (cb: () => void) => { ready: Promise<void>; finished: Promise<void> };
  };
  if (!doc.startViewTransition || isStill()) return fn();
  // solo se animan las tarjetas (view-transition-name por tarjeta): la página no se desvanece (vt-local en atelier.css)
  const root = document.documentElement;
  root.classList.add("vt-local");
  const t = doc.startViewTransition(() => flushSync(fn));
  t.ready.catch(() => {});
  t.finished.catch(() => {}).finally(() => root.classList.remove("vt-local"));
}

/** Catálogo — design/mockups/catalogo.html */
export function CatalogView({ initial, initialProducts, collections, colors, priceRange }: Props) {
  const [state, setState] = useState(initial);
  const [products, setProducts] = useState(initialProducts);
  const [sheet, setSheet] = useState(false);
  const tabs = useRef<HTMLDivElement>(null);
  const ink = useRef<HTMLElement>(null);
  const seg = useRef<HTMLDivElement>(null);
  const knob = useRef<HTMLElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const reqId = useRef(0);
  // solo las tarjetas de la primera carga entran con "reveal"; las que llegan por un filtro las anima la transición
  const firstLoad = useRef(new Set(initialProducts.map((p) => p.slug)));
  const shopCols = collections.filter((c) => c.productCount > 0);
  const colName = collections.find((c) => c.slug === state.col)?.name;

  // URL ↔ estado (replace: los filtros no ensucian el historial). Se compara contra lo último escrito
  // para que el doble efecto de StrictMode no reescriba la URL (y no se pierdan parámetros como ?static).
  const lastUrl = useRef(toUrl(initial));
  useEffect(() => {
    const url = toUrl(state);
    if (url === lastUrl.current) return;
    lastUrl.current = url;
    history.replaceState(null, "", url);
  }, [state]);

  // trae los productos con los filtros (debounce corto para el buscador y el precio)
  const queryKey = JSON.stringify(toQuery(state));
  const lastKey = useRef(JSON.stringify(toQuery(initial)));
  // biome-ignore lint/correctness/useExhaustiveDependencies: queryKey resume el estado relevante
  useEffect(() => {
    if (queryKey === lastKey.current) return;
    lastKey.current = queryKey;
    const id = ++reqId.current;
    const t = setTimeout(async () => {
      try {
        const list = await api.products(toQuery(state));
        if (id === reqId.current) withTransition(() => setProducts(list));
      } catch {
        toast("No pudimos actualizar el catálogo, probá de nuevo");
      }
    }, 180);
    return () => clearTimeout(t);
  }, [queryKey]);

  const update = (patch: Partial<CatalogState>) => setState((s) => ({ ...s, ...patch }));
  const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  // tinta bajo la pestaña activa y perilla del selector de vista
  const place = useCallback(() => {
    const t = tabs.current?.querySelector<HTMLButtonElement>(`[data-col="${state.col}"]`);
    if (t && ink.current) {
      ink.current.style.transform = `translateX(${t.offsetLeft}px)`;
      ink.current.style.width = `${t.offsetWidth}px`;
    }
    const b = seg.current?.querySelector<HTMLButtonElement>(`[data-view="${state.view}"]`);
    if (b && knob.current) {
      knob.current.style.transform = `translateX(${b.offsetLeft}px)`;
      knob.current.style.width = `${b.offsetWidth}px`;
    }
  }, [state.col, state.view]);
  useLayoutEffect(() => {
    place();
    addEventListener("resize", place);
    void document.fonts?.ready.then(place);
    return () => removeEventListener("resize", place);
  }, [place]);

  // el cierre de la grilla ocupa lo que sobra de la última fila
  // biome-ignore lint/correctness/useExhaustiveDependencies: se recalcula al cambiar la lista o la vista
  useLayoutEffect(() => {
    const fitEndTile = () => {
      const g = grid.current;
      const end = g?.querySelector<HTMLElement>(".end-tile");
      const firstEl = g?.firstElementChild as HTMLElement | null;
      if (!g || !end || !firstEl) return;
      end.style.gridColumn = "";
      const cols = getComputedStyle(g).gridTemplateColumns.split(" ").length;
      const step = firstEl.getBoundingClientRect().width + Number.parseFloat(getComputedStyle(g).columnGap);
      if (!step) {
        end.style.gridColumn = "1 / -1";
        return;
      }
      const col = Math.round((end.getBoundingClientRect().left - firstEl.getBoundingClientRect().left) / step);
      end.style.gridColumn = `span ${Math.max(1, cols - col)}`;
    };
    fitEndTile();
    addEventListener("resize", fitEndTile);
    return () => removeEventListener("resize", fitEndTile);
  }, [products, state.view]);

  useEffect(() => {
    document.body.classList.toggle("menu-open", sheet);
  }, [sheet]);

  const n = products.length;
  const chips: [string, () => void][] = [
    ...state.sizes.map((s): [string, () => void] => [
      `Talle ${s}`,
      () => update({ sizes: state.sizes.filter((x) => x !== s) }),
    ]),
    ...state.occ.map((o): [string, () => void] => [
      OCCASIONS[o],
      () => update({ occ: state.occ.filter((x) => x !== o) }),
    ]),
    ...state.colors.map((c): [string, () => void] => [
      c,
      () => update({ colors: state.colors.filter((x) => x !== c) }),
    ]),
    ...(state.max ? [[`Hasta ${formatARS(state.max)}`, () => update({ max: null })] as [string, () => void]] : []),
    ...(state.q ? [[`“${state.q}”`, () => update({ q: "" })] as [string, () => void]] : []),
  ];
  const clear = () => update(EMPTY);
  const fc = activeFilterCount(state);

  const cards = products.map((p, i) => (
    <ProductCardContainer
      key={p.slug}
      product={p}
      index={i}
      reveal={firstLoad.current.has(p.slug)}
      style={{ viewTransitionName: `c-${p.slug}` } as CSSProperties}
    />
  ));
  if (cards.length > 4)
    cards.splice(
      4,
      0,
      <div className="promo-tile" key="promo" style={{ viewTransitionName: "promo" }}>
        <div className="big-bow">
          <Foco />
        </div>
        <span className="eyebrow" style={{ color: "var(--rosa)" }}>
          ¿No sabés el talle?
        </span>
        <div>
          <p className="display">
            Decile la edad a <em>Galú</em> y te muestra lo que le queda.
          </p>
          <OpenGaluButton className="btn btn-rose btn-sm">
            <MessageCircleHeart className="i-sm" /> Preguntarle
          </OpenGaluButton>
        </div>
      </div>,
    );

  return (
    <main>
      <div className="cat-band bg-linen hem-bottom">
        <div className="wrap">
          <div className="cat-hero">
            <div>
              <span className="eyebrow">Tienda y catálogo</span>
              <h1 className="display h1">
                {colName ? (
                  <>
                    {colName.replace(/(\S+)$/, "")}
                    <em>{colName.match(/(\S+)$/)?.[1]}</em>
                  </>
                ) : (
                  <>
                    Todo el <em>taller</em>
                  </>
                )}
              </h1>
            </div>
            <span className="hand">pocas de cada una ✿</span>
          </div>
          <div className="tabs" role="tablist" ref={tabs}>
            {[{ slug: "", name: "Todo" }, ...shopCols].map((c) => (
              <button
                key={c.slug}
                type="button"
                role="tab"
                data-col={c.slug}
                aria-selected={state.col === c.slug}
                onClick={() => update({ col: c.slug })}
              >
                {c.name}
              </button>
            ))}
            <i className="ink" ref={ink} />
          </div>
        </div>
      </div>

      <div className="toolbar" id="buscar">
        <div className="wrap">
          <button type="button" className="btn btn-sm btn-ghost filters-btn" onClick={() => setSheet(true)}>
            <SlidersHorizontal className="i-sm" /> Filtros <span className="n">{fc || ""}</span>
          </button>
          <label className="search">
            <Search className="i-sm" />
            <input
              type="search"
              value={state.q}
              onChange={(e) => update({ q: e.target.value })}
              placeholder="Buscá “vestido rojo”, “plumeti”, “bautismo”…"
              aria-label="Buscar"
            />
          </label>
          <div className="seg" role="group" aria-label="Vista" ref={seg}>
            <i className="knob" ref={knob} />
            <button
              type="button"
              data-view="shop"
              aria-pressed={state.view === "shop"}
              aria-label="Vista tienda"
              onClick={() => update({ view: "shop" })}
            >
              <LayoutGrid className="i-sm" />
              <span>Tienda</span>
            </button>
            <button
              type="button"
              data-view="lookbook"
              aria-pressed={state.view === "lookbook"}
              aria-label="Vista lookbook"
              onClick={() => update({ view: "lookbook" })}
            >
              <ImageIcon className="i-sm" />
              <span>Lookbook</span>
            </button>
          </div>
          <select
            className="input sort"
            aria-label="Ordenar"
            value={state.sort}
            onChange={(e) => update({ sort: e.target.value as CatalogState["sort"] })}
          >
            <option value="new">Más nuevos</option>
            <option value="asc">Menor precio</option>
            <option value="desc">Mayor precio</option>
            <option value="pop">Más vendidos</option>
          </select>
          <span className="count">
            {n} {n === 1 ? "prenda" : "prendas"}
          </span>
        </div>
      </div>

      <div className="wrap layout">
        <CatalogFilters
          state={state}
          colors={colors}
          minPrice={priceRange.minCents}
          maxPrice={priceRange.maxCents}
          open={sheet}
          resultCount={n}
          onToggleSize={(s) => update({ sizes: toggle(state.sizes, s) })}
          onToggleOcc={(o) => update({ occ: toggle(state.occ, o) })}
          onToggleColor={(c) => update({ colors: toggle(state.colors, c) })}
          onMax={(v) => update({ max: v >= priceRange.maxCents ? null : v })}
          onInstock={(instock) => update({ instock })}
          onClear={clear}
          onClose={() => setSheet(false)}
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label="Cerrar filtros"
          className={`scrim ${sheet ? "is-open" : ""}`}
          style={{ zIndex: 91 }}
          onClick={() => setSheet(false)}
        />

        <section aria-live="polite">
          <div className="active-row">
            {chips.map(([label, rm]) => (
              <button key={label} type="button" className="chip" onClick={rm}>
                {label} <X />
              </button>
            ))}
            {chips.length > 1 && (
              <button type="button" className="link" style={{ fontSize: 13 }} onClick={clear}>
                Limpiar todo
              </button>
            )}
          </div>

          <div className="grid" ref={grid} hidden={state.view !== "shop"}>
            {n ? (
              <>
                {cards}
                <div className="end-tile">
                  <span className="emb">
                    <Embroidery />
                  </span>
                  <span className="hand">eso es todo… por ahora ♡</span>
                  <p>Cada mes salen tandas nuevas y pocas por talle. Anotate y te avisamos antes que en Instagram.</p>
                  <div className="row">
                    <Link className="btn btn-sm" href="/#lanzamiento">
                      <BellRing className="i-sm" /> Avisame de lo nuevo
                    </Link>
                    <Link className="btn btn-sm btn-ghost" href="/#lanzamiento">
                      Ver el lanzamiento
                    </Link>
                  </div>
                </div>
              </>
            ) : (
              <div className="empty empty-state">
                <Embroidery />
                <div className="hand" style={{ fontSize: 36 }}>
                  Nada por acá…
                </div>
                <p className="muted" style={{ maxWidth: "40ch", margin: "0 0 8px" }}>
                  Probá con otro talle o preguntale a Galú: te avisamos cuando vuelva lo que buscás.
                </p>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
                  <button type="button" className="btn" onClick={clear}>
                    Limpiar filtros
                  </button>
                  <OpenGaluButton className="btn btn-ghost">Preguntarle a Galú</OpenGaluButton>
                </div>
              </div>
            )}
          </div>

          <div className="lookbook" hidden={state.view === "shop"}>
            {n ? (
              products.flatMap((p) =>
                p.images.slice(0, 2).map((im) => (
                  <Link key={im.url} className="lb-item" href={`/producto/${p.slug}`}>
                    <img src={im.url} alt={p.name} loading="lazy" />
                    <div className="cap">
                      <b>{p.name}</b>
                      <span>{formatARS(p.priceCents)}</span>
                    </div>
                  </Link>
                )),
              )
            ) : (
              <div className="empty-state" style={{ columnSpan: "all" }}>
                <Embroidery />
                <div className="hand" style={{ fontSize: 36 }}>
                  Nada por acá…
                </div>
                <button type="button" className="btn" onClick={clear}>
                  Limpiar filtros
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

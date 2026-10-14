import { FILTER_OCCASIONS, formatARS, GARMENT_SIZES, OCCASIONS, type Occasion, type Size } from "@mini-galu/contracts";
import { Ruler, X } from "lucide-react";
import Link from "next/link";
import type { CatalogState } from "../catalog-state";

/** Nena de la cuenta con su talle, para filtrar con un toque. */
export type FilterNena = { id: string; name: string; age: number | null; size: Size };

type Props = {
  state: CatalogState;
  nenas: FilterNena[];
  /** La nena elegida (su talle es el filtro). */
  nena: string | null;
  colors: { name: string; hex: string }[];
  minPrice: number;
  maxPrice: number;
  open: boolean;
  resultCount: number;
  onNena: (n: FilterNena) => void;
  onToggleSize: (s: Size) => void;
  onToggleOcc: (o: Occasion) => void;
  onToggleColor: (c: string) => void;
  onMax: (cents: number) => void;
  onInstock: (v: boolean) => void;
  onClear: () => void;
  onClose: () => void;
};

/** Barra lateral en escritorio; hoja que sube desde abajo en celular. */
export function CatalogFilters({ state, nenas, nena, colors, minPrice, maxPrice, open, resultCount, ...on }: Props) {
  const max = state.max ?? maxPrice;
  return (
    <aside className={`filters ${open ? "is-open" : ""}`} id="filters" aria-label="Filtros">
      <div className="filters-head">
        <b className="display" style={{ fontSize: 24 }}>
          Filtros
        </b>
        <button type="button" className="icon-btn" aria-label="Cerrar filtros" onClick={on.onClose}>
          <X />
        </button>
      </div>
      {nenas.length > 0 && (
        <div>
          <h4>Para mis nenas</h4>
          <div style={{ display: "grid", gap: 8 }}>
            {nenas.map((n) => (
              <button
                key={n.id}
                type="button"
                className="nena"
                aria-pressed={nena === n.id}
                onClick={() => on.onNena(n)}
              >
                <span className="av">{n.name[0]}</span>
                <span>
                  <b>{n.name}</b>
                  <small>
                    {n.age !== null && `${n.age} ${n.age === 1 ? "año" : "años"} · `}talle {n.size}
                  </small>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
      <div>
        <h4>Talle</h4>
        <div className="chips">
          {GARMENT_SIZES.map((s) => (
            <button
              key={s}
              type="button"
              className="chip"
              aria-pressed={state.sizes.includes(s)}
              onClick={() => on.onToggleSize(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      <div>
        <h4>Ocasión</h4>
        <div className="chips">
          {FILTER_OCCASIONS.map((o) => (
            <button
              key={o}
              type="button"
              className="chip"
              aria-pressed={state.occ.includes(o)}
              onClick={() => on.onToggleOcc(o)}
            >
              {OCCASIONS[o]}
            </button>
          ))}
        </div>
      </div>
      <div>
        <h4>Color</h4>
        <div className="sw-row">
          {colors.map((c) => (
            <button
              key={c.name}
              type="button"
              className="sw"
              style={{ background: c.hex }}
              aria-pressed={state.colors.includes(c.name)}
              title={c.name}
              aria-label={c.name}
              onClick={() => on.onToggleColor(c.name)}
            />
          ))}
        </div>
      </div>
      <div>
        <h4>
          Precio hasta <span>{formatARS(max)}</span>
        </h4>
        <input
          type="range"
          min={minPrice}
          max={maxPrice}
          step={50000}
          value={max}
          aria-label="Precio máximo"
          onChange={(e) => on.onMax(Number(e.target.value))}
        />
      </div>
      <label className="switch">
        Solo con stock{" "}
        <input
          className="tog"
          type="checkbox"
          checked={state.instock}
          onChange={(e) => on.onInstock(e.target.checked)}
        />
      </label>
      <button type="button" className="link" style={{ justifySelf: "start" }} onClick={on.onClear}>
        Limpiar filtros
      </button>
      <div className="size-tip">
        <Ruler />
        <div>
          <b>¿Entre dos talles?</b>
          <span>Elegí el más grande: los modelos tienen 3 cm de holgura para que duren más.</span>
          <Link className="link" href="/producto/cleo#medidas">
            Ver la tabla
          </Link>
        </div>
        <span className="hand">¡crecen rapidísimo!</span>
      </div>
      <div className="filters-foot">
        <button type="button" className="btn btn-ghost" onClick={on.onClear}>
          Limpiar
        </button>
        <button type="button" className="btn" onClick={on.onClose}>
          {resultCount ? `Ver ${resultCount} ${resultCount === 1 ? "prenda" : "prendas"}` : "Sin resultados"}
        </button>
      </div>
    </aside>
  );
}

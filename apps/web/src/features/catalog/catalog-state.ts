import type { CatalogQueryInput, Occasion, Size, Sort } from "@mini-galu/contracts";

/** Estado de filtros del catálogo ↔ query string (?col=fiestas&talle=6,8&ocasion=bautismo&q=…&view=lookbook). */
export type CatalogState = {
  col: string;
  sizes: Size[];
  occ: Occasion[];
  colors: string[];
  max: number | null;
  instock: boolean;
  q: string;
  sort: Sort;
  view: "shop" | "lookbook";
};

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const list = (v: string | string[] | undefined) => one(v).split(",").filter(Boolean);
const SIZE_IN_Q = /talle\s*(12\s*m\b|\d{1,2})/i;

export function stateFromParams(p: Params): CatalogState {
  let q = one(p.q);
  const sizes = list(p.talle) as Size[];
  // "vestido rojo talle 6" → texto + filtro de talle (como el buscador del mockup)
  const m = q.match(SIZE_IN_Q);
  if (m?.[1]) {
    const s = m[1].replace(/\s/g, "") as Size;
    if (!sizes.includes(s)) sizes.push(s);
    q = q.replace(SIZE_IN_Q, "").trim();
  }
  const sort = one(p.sort) as Sort;
  return {
    col: one(p.col),
    sizes,
    occ: list(p.ocasion) as Occasion[],
    colors: list(p.color),
    max: Number(one(p.max)) || null,
    instock: one(p.instock) !== "0",
    q,
    sort: ["new", "asc", "desc", "pop"].includes(sort) ? sort : "new",
    view: one(p.view) === "lookbook" ? "lookbook" : "shop",
  };
}

export function toQuery(s: CatalogState): CatalogQueryInput {
  return {
    col: s.col || undefined,
    talle: s.sizes.join(",") || undefined,
    ocasion: s.occ.join(",") || undefined,
    color: s.colors.join(",") || undefined,
    max: s.max ?? undefined,
    instock: s.instock ? undefined : "0",
    q: s.q || undefined,
    sort: s.sort === "new" ? undefined : s.sort,
  };
}

export function toUrl(s: CatalogState): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(toQuery(s))) if (v !== undefined) sp.set(k, String(v));
  if (s.view === "lookbook") sp.set("view", "lookbook");
  const str = sp.toString();
  return `/catalogo${str ? `?${str}` : ""}`;
}

export const activeFilterCount = (s: CatalogState) => s.sizes.length + s.occ.length + s.colors.length + (s.max ? 1 : 0);

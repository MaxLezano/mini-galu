"use client";

import type { AdminProduct, Collection, SaveProductResult } from "@mini-galu/contracts";
import { BellRing, Check, EyeOff, Package, Plus, Search, Shirt, TrendingUp } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { toast } from "@/features/shell/ui-store";
import { adminApi } from "@/lib/admin-api";
import { ApiRequestError } from "@/lib/api";
import { ProductEditor } from "./ProductEditor";
import { ProductsTable } from "./ProductsTable";
import { FILTERS, filterCounts, kpis, type ProductFilter, type ProductSort, viewProducts } from "./products-view";
import "./products.css";

/** Productos del panel — design/mockups/admin-productos.html */
export function ProductsAdmin({ initial, collections }: { initial: AdminProduct[]; collections: Collection[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [products, setProducts] = useState(initial);
  const [filter, setFilter] = useState<ProductFilter>("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<ProductSort>("name");
  const [busy, setBusy] = useState<string | null>(null);

  // el editor se abre por URL (?editar=slug / ?nuevo) para que la búsqueda global y "atrás" funcionen
  const editing = params.get("editar");
  const isNew = params.has("nuevo");
  const current = editing ? (products.find((p) => p.slug === editing) ?? null) : null;
  const open = isNew || !!current;
  const openEditor = (slug?: string) =>
    router.push(`${pathname}?${slug ? `editar=${slug}` : "nuevo"}`, { scroll: false });
  const close = useCallback(() => router.push(pathname, { scroll: false }), [router, pathname]);

  const k = kpis(products);
  const counts = filterCounts(products);
  const list = useMemo(() => viewProducts(products, filter, q, sort), [products, filter, q, sort]);

  const upsert = (p: AdminProduct) =>
    setProducts((l) => (l.some((x) => x.slug === p.slug) ? l.map((x) => (x.slug === p.slug ? p : x)) : [...l, p]));

  const onSaved = ({ product, replenished }: SaveProductResult) => {
    upsert(product);
    close();
    const waiting = replenished.reduce((a, r) => a + r.waiting, 0);
    toast(
      waiting
        ? `${product.name} guardado · volvió stock para ${waiting} ${waiting === 1 ? "persona anotada" : "personas anotadas"}`
        : product.status === "published"
          ? `${product.name} guardado y publicado`
          : `${product.name} guardado como borrador`,
      { icon: waiting ? <BellRing className="i-sm" /> : <Check className="i-sm" /> },
    );
  };

  const togglePublish = async (p: AdminProduct, published: boolean) => {
    setBusy(p.slug);
    // optimista: el switch cambia al toque y vuelve atrás si la API no acepta
    upsert({ ...p, status: published ? "published" : "draft" });
    try {
      upsert(await adminApi.setStatus(p.slug, published ? "published" : "draft"));
      toast(published ? `${p.name} publicado` : `${p.name} oculto de la tienda`, {
        icon: published ? <Check className="i-sm" /> : <EyeOff className="i-sm" />,
      });
    } catch (e) {
      upsert(p);
      toast(e instanceof ApiRequestError ? e.message : "No se pudo cambiar, probá de nuevo");
    } finally {
      setBusy(null);
    }
  };

  return (
    <main className="adm-content">
      <div className="adm-head">
        <div>
          <span className="eyebrow is-in">Tienda</span>
          <h1 className="display">Productos</h1>
        </div>
        <div className="actions">
          <button type="button" className="btn btn-sm" onClick={() => openEditor()}>
            <Plus className="i-sm" /> Nuevo producto
          </button>
        </div>
      </div>

      <div className="kpis">
        <div className="kpi">
          <span>
            <Shirt className="i-sm" /> Publicados
          </span>
          <b>{k.published}</b>
          <small className="muted">{k.drafts} en borrador</small>
        </div>
        <div className="kpi">
          <span>
            <Package className="i-sm" /> Unidades en stock
          </span>
          <b>{k.units}</b>
          <small className="muted">{k.soldOut} talles agotados</small>
        </div>
        <div className="kpi">
          <span>
            <BellRing className="i-sm" /> Anotadas esperando
          </span>
          <b>{k.waiting}</b>
          <small className="muted">por talle o por lanzamiento</small>
        </div>
        <div className="kpi">
          <span>
            <TrendingUp className="i-sm" /> Vendidas
          </span>
          <b>{k.sold}</b>
          <small className="muted">{k.best ? `${k.best} es el más vendido` : "todavía sin ventas"}</small>
        </div>
      </div>

      <section className="box">
        <div className="p-filters" style={{ marginBottom: 16 }}>
          <div className="filters-row">
            {FILTERS.map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={`chip ${filter === key ? "is-on" : ""}`}
                onClick={() => setFilter(key)}
              >
                {label} <span className="count">{counts[key]}</span>
              </button>
            ))}
          </div>
          <span className="grow" />
          <label className="tiny-search">
            <span>
              <Search className="i-sm" />
            </span>
            <input
              className="input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar producto"
              aria-label="Buscar producto"
            />
          </label>
          <select
            className="input"
            value={sort}
            onChange={(e) => setSort(e.target.value as ProductSort)}
            style={{ width: "auto", height: 40, borderRadius: 999, fontSize: 13.5 }}
            aria-label="Ordenar"
          >
            <option value="name">Nombre</option>
            <option value="stock">Menos stock</option>
            <option value="sold">Más vendidos</option>
            <option value="wait">Más lista de espera</option>
          </select>
        </div>
        <ProductsTable
          products={list}
          busySlug={busy}
          onEdit={(p) => openEditor(p.slug)}
          onTogglePublish={togglePublish}
        />
      </section>

      <ProductEditor open={open} product={current} collections={collections} onClose={close} onSaved={onSaved} />
    </main>
  );
}

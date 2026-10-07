"use client";

import {
  ACCEPTED_IMAGE_TYPES,
  type AdminProduct,
  type Collection,
  MAX_IMAGE_BYTES,
  OCCASIONS,
  type Occasion,
  ProductInputSchema,
  type ProductStatus,
  type SaveProductResult,
  SIZES,
  type Size,
  sizeOrder,
} from "@mini-galu/contracts";
import { ArrowLeft, ArrowRight, Bell, BellRing, ImagePlus, Minus, Plus, Workflow, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "@/features/shell/ui-store";
import { adminApi } from "@/lib/admin-api";
import { ApiRequestError } from "@/lib/api";
import { emptyForm, type ProductForm, pendingNotices, toForm, toInput } from "./product-form";

type Props = {
  open: boolean;
  product: AdminProduct | null;
  collections: Collection[];
  onClose: () => void;
  onSaved: (r: SaveProductResult) => void;
};

const TAGS = ["Nuevo", "Incluye moño", "Con vincha", "Edición limitada"];

/** Editor lateral de productos (mockup admin-productos.html → #editor). */
export function ProductEditor({ open, product, collections, onClose, onSaved }: Props) {
  const [form, setForm] = useState<ProductForm>(() => emptyForm(collections[0]?.slug ?? ""));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<ProductStatus | null>(null);
  const [uploading, setUploading] = useState(0);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // cada vez que se abre, arranca del producto (o vacío)
  useEffect(() => {
    if (!open) return;
    setForm(product ? toForm(product) : emptyForm(collections[0]?.slug ?? ""));
    setError(null);
  }, [open, product, collections]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const set = <K extends keyof ProductForm>(k: K, v: ProductForm[K]) => setForm((f) => ({ ...f, [k]: v }));
  const notices = pendingNotices(product, form);
  const missingSizes = SIZES.filter((s) => !form.variants.some((v) => v.size === s));

  const moveImage = (from: number, to: number) =>
    setForm((f) => {
      if (to < 0 || to >= f.images.length) return f;
      const images = [...f.images];
      const [it] = images.splice(from, 1);
      if (it) images.splice(to, 0, it);
      return { ...f, images };
    });

  const upload = async (files: FileList | null) => {
    for (const file of Array.from(files ?? [])) {
      if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
        toast(`${file.name}: subí WebP, JPG, PNG o AVIF`);
        continue;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        toast(`${file.name} pesa más de 8 MB`);
        continue;
      }
      setUploading((n) => n + 1);
      try {
        const r = await adminApi.uploadImage(file);
        setForm((f) => ({ ...f, images: [...f.images, { ...r, alt: "" }] }));
      } catch (e) {
        toast(e instanceof ApiRequestError ? e.message : `No se pudo subir ${file.name}`);
      } finally {
        setUploading((n) => n - 1);
      }
    }
  };

  const setVariant = (size: Size, patch: Partial<ProductForm["variants"][number]>) =>
    set(
      "variants",
      form.variants.map((v) => (v.size === size ? { ...v, ...patch } : v)),
    );

  const save = async (status: ProductStatus) => {
    const input = toInput(form, status);
    const check = ProductInputSchema.safeParse(input);
    if (!check.success) {
      setError(check.error.issues[0]?.message ?? "Revisá los datos");
      return;
    }
    setSaving(status);
    setError(null);
    try {
      const r = product
        ? await adminApi.updateProduct(product.slug, check.data)
        : await adminApi.createProduct(check.data);
      onSaved(r);
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : "No se pudo guardar, probá de nuevo");
    } finally {
      setSaving(null);
    }
  };

  const waitingFor = (size: Size) => product?.waitlist.find((w) => w.size === size)?.count ?? 0;

  return (
    <>
      <button
        type="button"
        tabIndex={-1}
        aria-label="Cerrar editor"
        className={`scrim ${open ? "is-open" : ""}`}
        onClick={onClose}
      />
      <aside className={`drawer wide ${open ? "is-open" : ""}`} aria-label="Editar producto" aria-hidden={!open}>
        <div className="drawer-head">
          <div>
            <span className="eyebrow is-in">
              {product ? (product.status === "draft" ? "Borrador" : "Publicado") : "Nuevo"}
            </span>
            <h2 className="display h3" style={{ marginTop: 6 }}>
              {product ? product.name : "Nuevo producto"}
            </h2>
          </div>
          <button type="button" className="icon-btn" aria-label="Cerrar" onClick={onClose}>
            <X />
          </button>
        </div>

        <div className="drawer-body">
          <div className="ed-sec">
            <h4>
              Fotos{" "}
              <span className="muted" style={{ letterSpacing: 0, textTransform: "none", fontWeight: 500 }}>
                arrastrá para ordenar · la primera es la portada
              </span>
            </h4>
            <div className="photos">
              {form.images.map((im, i) => (
                // biome-ignore lint/a11y/noStaticElementInteractions: el orden también se cambia con los botones ← →
                <div
                  key={im.path}
                  className={`photo ${dragOver === i ? "is-over" : ""}`}
                  draggable
                  onDragStart={() => setDragFrom(i)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(i);
                  }}
                  onDragLeave={() => setDragOver(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragFrom !== null) moveImage(dragFrom, i);
                    setDragFrom(null);
                    setDragOver(null);
                  }}
                >
                  <img src={im.url} alt={im.alt} />
                  {i === 0 && <span className="label-tag is-dark main">Portada</span>}
                  <button
                    type="button"
                    className="rm"
                    aria-label="Quitar foto"
                    onClick={() =>
                      set(
                        "images",
                        form.images.filter((_, k) => k !== i),
                      )
                    }
                  >
                    <X className="i-sm" />
                  </button>
                  <span className="mv">
                    <button
                      type="button"
                      aria-label="Mover a la izquierda"
                      disabled={i === 0}
                      onClick={() => moveImage(i, i - 1)}
                    >
                      <ArrowLeft className="i-sm" />
                    </button>
                    <button
                      type="button"
                      aria-label="Mover a la derecha"
                      disabled={i === form.images.length - 1}
                      onClick={() => moveImage(i, i + 1)}
                    >
                      <ArrowRight className="i-sm" />
                    </button>
                  </span>
                </div>
              ))}
              {Array.from({ length: uploading }, (_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: marcadores temporales de subida
                <div key={`up-${i}`} className="photo is-uploading">
                  Subiendo…
                </div>
              ))}
              <button type="button" className="photo add" onClick={() => fileInput.current?.click()}>
                <ImagePlus />
                <span>
                  Subir fotos
                  <br />
                  (vertical 3:4)
                </span>
              </button>
              <input
                ref={fileInput}
                type="file"
                accept={ACCEPTED_IMAGE_TYPES.join(",")}
                multiple
                hidden
                onChange={(e) => {
                  void upload(e.target.files);
                  e.target.value = "";
                }}
              />
            </div>
          </div>

          <div className="ed-sec">
            <h4>Datos</h4>
            <div className="field">
              <label htmlFor="e-name">Nombre</label>
              <input className="input" id="e-name" value={form.name} onChange={(e) => set("name", e.target.value)} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="field">
                <label htmlFor="e-col">Colección</label>
                <select
                  className="input"
                  id="e-col"
                  value={form.collectionSlug}
                  onChange={(e) => set("collectionSlug", e.target.value)}
                >
                  {collections.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="e-color">Color</label>
                <div className="color-field">
                  <input
                    className="input"
                    id="e-color"
                    value={form.colorName}
                    onChange={(e) => set("colorName", e.target.value)}
                    placeholder="Ej. Salvia"
                  />
                  <input
                    type="color"
                    aria-label="Tono"
                    value={form.colorHex}
                    onChange={(e) => set("colorHex", e.target.value.toUpperCase())}
                  />
                </div>
              </div>
              <div className="field">
                <label htmlFor="e-price">Precio</label>
                <input
                  className="input"
                  id="e-price"
                  inputMode="numeric"
                  value={form.price}
                  onChange={(e) => set("price", e.target.value)}
                  placeholder="$"
                />
              </div>
              <div className="field">
                <label htmlFor="e-was">Precio anterior (opcional)</label>
                <input
                  className="input"
                  id="e-was"
                  inputMode="numeric"
                  value={form.compareAt}
                  onChange={(e) => set("compareAt", e.target.value)}
                  placeholder="Para mostrar descuento"
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="e-desc">Descripción</label>
              <textarea
                className="input"
                id="e-desc"
                rows={3}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="field">
                <label htmlFor="e-fab">Tela</label>
                <input
                  className="input"
                  id="e-fab"
                  value={form.fabric}
                  onChange={(e) => set("fabric", e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="e-tag">Etiqueta (opcional)</label>
                <input
                  className="input"
                  id="e-tag"
                  list="e-tags"
                  value={form.tag}
                  maxLength={24}
                  onChange={(e) => set("tag", e.target.value)}
                  placeholder="Ej. Nuevo"
                />
                <datalist id="e-tags">
                  {TAGS.map((t) => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
              </div>
            </div>
            <div className="field">
              <span className="lbl">Ocasiones (las usa Galú para recomendar)</span>
              <div className="occ">
                {(Object.entries(OCCASIONS) as [Occasion, string][]).map(([k, v]) => (
                  <button
                    key={k}
                    type="button"
                    className="chip"
                    aria-pressed={form.occasions.includes(k)}
                    onClick={() =>
                      set(
                        "occasions",
                        form.occasions.includes(k) ? form.occasions.filter((o) => o !== k) : [...form.occasions, k],
                      )
                    }
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <label htmlFor="e-care">Cuidados</label>
              <textarea
                className="input"
                id="e-care"
                rows={2}
                value={form.care}
                onChange={(e) => set("care", e.target.value)}
              />
            </div>
          </div>

          <div className="ed-sec">
            <h4>Talles y stock</h4>
            <table className="sv">
              <thead>
                <tr>
                  <th>Talle</th>
                  <th>Stock</th>
                  <th className="meas-col">Largo · axila · cintura (cm)</th>
                  <th>Esperando</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {form.variants.map((v) => {
                  const w = waitingFor(v.size);
                  const back = notices.some((n) => n.size === v.size);
                  return (
                    <tr key={v.size}>
                      <td>
                        <span className="sz">{v.size}</span>
                      </td>
                      <td>
                        <span className="stepper-n">
                          <button
                            type="button"
                            aria-label={`Menos talle ${v.size}`}
                            onClick={() => setVariant(v.size, { stock: Math.max(0, v.stock - 1) })}
                          >
                            <Minus className="i-sm" />
                          </button>
                          <input
                            aria-label={`Stock talle ${v.size}`}
                            inputMode="numeric"
                            value={v.stock}
                            onChange={(e) =>
                              setVariant(v.size, {
                                stock: Math.min(999, Number(e.target.value.replace(/\D/g, "")) || 0),
                              })
                            }
                          />
                          <button
                            type="button"
                            aria-label={`Más talle ${v.size}`}
                            onClick={() => setVariant(v.size, { stock: Math.min(999, v.stock + 1) })}
                          >
                            <Plus className="i-sm" />
                          </button>
                        </span>
                      </td>
                      <td className="meas-col">
                        <span className="meas">
                          {(["largo", "axila", "cintura"] as const).map((k) => (
                            <input
                              key={k}
                              className="input"
                              inputMode="numeric"
                              aria-label={`${k} talle ${v.size}`}
                              placeholder={k[0]?.toUpperCase()}
                              value={v.measures[k] ?? ""}
                              onChange={(e) =>
                                setVariant(v.size, {
                                  measures: {
                                    ...v.measures,
                                    [k]: Number(e.target.value.replace(/\D/g, "")) || undefined,
                                  },
                                })
                              }
                            />
                          ))}
                        </span>
                      </td>
                      <td>
                        {w ? (
                          back ? (
                            <span className="notify">
                              <BellRing className="i-sm" /> Vuelve para {w}
                            </span>
                          ) : (
                            <span className="wl">
                              <Bell className="i-sm" /> {w}
                            </span>
                          )
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="icon-btn"
                          style={{ width: 32, height: 32 }}
                          aria-label={`Quitar talle ${v.size}`}
                          onClick={() =>
                            set(
                              "variants",
                              form.variants.filter((x) => x.size !== v.size),
                            )
                          }
                        >
                          <X className="i-sm" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {missingSizes.length > 0 && (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <select
                  className="input"
                  style={{ height: 38, width: "auto", fontSize: 13 }}
                  value=""
                  aria-label="Agregar talle"
                  onChange={(e) => {
                    const size = e.target.value as Size;
                    if (!size) return;
                    set(
                      "variants",
                      [...form.variants, { size, stock: 0, measures: {} }].sort(
                        (a, b) => sizeOrder(a.size) - sizeOrder(b.size),
                      ),
                    );
                  }}
                >
                  <option value="">Agregar talle…</option>
                  {missingSizes.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="ed-sec">
            <h4>Visibilidad</h4>
            <label className="switch">
              Es un accesorio (moños, vinchas: Galú los sugiere para completar el look)
              <input
                className="tog"
                type="checkbox"
                checked={form.isAccessory}
                onChange={(e) => set("isAccessory", e.target.checked)}
              />
            </label>
          </div>
        </div>

        <div className="drawer-foot">
          {error && (
            <p className="ed-error" role="alert">
              {error}
            </p>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="btn btn-ghost" disabled={!!saving} onClick={() => save("draft")}>
              {saving === "draft" ? "Guardando…" : "Guardar borrador"}
            </button>
            <button
              type="button"
              className="btn"
              style={{ flex: 1 }}
              disabled={!!saving}
              onClick={() => save("published")}
            >
              {saving === "published" ? "Guardando…" : "Guardar y publicar"}
            </button>
          </div>
          <span className="muted" style={{ fontSize: 12, display: "flex", gap: 6, alignItems: "center" }}>
            {notices.length ? (
              <>
                <Workflow className="i-sm" /> Vuelve stock para{" "}
                <b>{notices.reduce((a, n) => a + n.waiting, 0)} personas anotadas</b>. El aviso automático llega con las
                automatizaciones (fase 6).
              </>
            ) : (
              "Los cambios de stock se reflejan al instante en la tienda y en Galú."
            )}
          </span>
        </div>
      </aside>
    </>
  );
}

"use client";

import {
  ACCEPTED_IMAGE_TYPES,
  type AdminLaunch,
  type AdminProduct,
  type Collection,
  LaunchInputSchema,
  MAX_IMAGE_BYTES,
} from "@mini-galu/contracts";
import { ImagePlus, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "@/features/shell/ui-store";
import { adminApi } from "@/lib/admin-api";
import { ApiRequestError } from "@/lib/api";
import { fromArInputs, launchWhen, toArInputs } from "@/lib/date";
import { cover as coverOf } from "@/lib/product";
import { BrandIcon } from "@/ui/atoms/BrandIcon";

type Props = {
  open: boolean;
  /** null = nuevo; con `copy` = usar de base un lanzamiento anterior. */
  launch: AdminLaunch | null;
  copy?: boolean;
  products: AdminProduct[];
  collections: Collection[];
  onClose: () => void;
  onSaved: (l: AdminLaunch) => void;
};

type Form = {
  title: string;
  coverNote: string;
  teaser: string;
  coverPath: string | null;
  coverUrl: string | null;
  date: string;
  time: string;
  collectionSlug: string;
  productSlugs: string[];
  showCountdown: boolean;
  notifyBefore: boolean;
  autoPublish: boolean;
  socialText: string;
  socialTouched: boolean;
};

const nextSaturday = () => {
  const d = new Date(Date.now() + 14 * 864e5);
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7));
  return toArInputs(d.toISOString()).date;
};

function initial(l: AdminLaunch | null, copy: boolean): Form {
  const when = l && !copy ? toArInputs(l.startsAt) : { date: nextSaturday(), time: "10:00" };
  return {
    title: l ? (copy ? `${l.title} (copia)` : l.title) : "",
    coverNote: l?.coverNote ?? "",
    teaser: l?.teaser ?? "",
    coverPath: l?.coverPath ?? null,
    coverUrl: l?.coverUrl ?? null,
    ...when,
    collectionSlug: l?.collectionSlug ?? "",
    productSlugs: copy ? [] : (l?.products.map((p) => p.slug) ?? []),
    showCountdown: l?.showCountdown ?? true,
    notifyBefore: l?.notifyBefore ?? true,
    autoPublish: l?.autoPublish ?? true,
    socialText: (!copy && l?.socialText) || "",
    socialTouched: !!(!copy && l?.socialText),
  };
}

/** Editor de lanzamientos con vista previa de la home (mockup admin-lanzamientos.html → #m-ln). */
export function LaunchEditor({ open, launch, copy = false, products, collections, onClose, onSaved }: Props) {
  const [f, setF] = useState<Form>(() => initial(launch, copy));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const editing = !!launch && !copy;
  const past = editing && launch?.state === "past";

  useEffect(() => {
    if (!open) return;
    setF(initial(launch, copy));
    setError(null);
  }, [open, launch, copy]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }));
  const startsAt = f.date ? fromArInputs(f.date, f.time) : null;
  const when = startsAt ? launchWhen(startsAt) : "pronto";
  const social = f.socialTouched
    ? f.socialText
    : `✿ ${f.title || "Nuevo lanzamiento"} ✿ ${f.teaser} Sale ${when} en minigalu.com.ar. Anotate y te avisamos 1 hora antes 🎀`;

  // portadas posibles: la actual, las fotos de las prendas elegidas y de las demás prendas
  const covers = useMemo(() => {
    const list: { path: string; url: string }[] = [];
    const add = (path: string | null | undefined, url: string | null | undefined) => {
      if (path && url && !list.some((c) => c.path === path)) list.push({ path, url });
    };
    add(f.coverPath, f.coverUrl);
    const chosen = products.filter((p) => f.productSlugs.includes(p.slug));
    for (const p of chosen) for (const im of p.images.slice(0, 2)) add(im.path, im.url);
    for (const p of products) add(p.images[0]?.path, p.images[0]?.url);
    return list.slice(0, 11);
  }, [products, f.productSlugs, f.coverPath, f.coverUrl]);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) return toast("Subí WebP, JPG, PNG o AVIF");
    if (file.size > MAX_IMAGE_BYTES) return toast("La foto pesa más de 8 MB");
    setUploading(true);
    try {
      const r = await adminApi.uploadImage(file, "content");
      setF((x) => ({ ...x, coverPath: r.path, coverUrl: r.url }));
    } catch (e) {
      toast(e instanceof ApiRequestError ? e.message : "No se pudo subir la foto");
    } finally {
      setUploading(false);
    }
  };

  const save = async (status: "draft" | "scheduled") => {
    if (!startsAt) return setError("Elegí la fecha del lanzamiento");
    const input = {
      title: f.title,
      coverNote: f.coverNote.trim() || null,
      teaser: f.teaser,
      coverPath: f.coverPath,
      startsAt,
      collectionSlug: f.collectionSlug || null,
      productSlugs: f.productSlugs,
      showCountdown: f.showCountdown,
      notifyBefore: f.notifyBefore,
      autoPublish: f.autoPublish,
      socialText: social.trim() || null,
      status,
    };
    const check = LaunchInputSchema.safeParse(input);
    if (!check.success) return setError(check.error.issues[0]?.message ?? "Revisá los datos");
    setSaving(true);
    setError(null);
    try {
      const saved =
        editing && launch
          ? await adminApi.updateLaunch(launch.id, check.data)
          : await adminApi.createLaunch(check.data);
      onSaved(saved);
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : "No se pudo guardar, probá de nuevo");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        type="button"
        tabIndex={-1}
        aria-label="Cerrar"
        className={`scrim modal-scrim ${open ? "is-open" : ""}`}
        onClick={onClose}
      />
      <div
        className={`modal ${open ? "is-open" : ""}`}
        id="m-ln"
        role="dialog"
        aria-modal="true"
        aria-label="Lanzamiento"
        aria-hidden={!open}
      >
        <div className="modal-head">
          <h3 className="display h3" style={{ margin: 0 }}>
            {editing ? "Editar" : "Nuevo"} <em>lanzamiento</em>
          </h3>
          <button type="button" className="icon-btn" aria-label="Cerrar" onClick={onClose}>
            <X />
          </button>
        </div>
        <form
          className="modal-body"
          onSubmit={(e) => {
            e.preventDefault();
            void save("scheduled");
          }}
        >
          <div className="ed">
            <div style={{ display: "grid", gap: 14 }}>
              <div className="two">
                <div className="field">
                  <label htmlFor="f-name">Nombre</label>
                  <input
                    className="input"
                    id="f-name"
                    value={f.title}
                    onChange={(e) => set("title", e.target.value)}
                    placeholder="Ej. Otoño · Invierno 26"
                  />
                </div>
                <div className="field">
                  <label htmlFor="f-tag">Frase corta</label>
                  <input
                    className="input"
                    id="f-tag"
                    value={f.coverNote}
                    maxLength={40}
                    onChange={(e) => set("coverNote", e.target.value)}
                    placeholder="Ej. se viene el frío ♡"
                  />
                </div>
              </div>
              <div className="field">
                <label htmlFor="f-desc">Adelanto</label>
                <textarea
                  className="input"
                  id="f-desc"
                  rows={2}
                  value={f.teaser}
                  onChange={(e) => set("teaser", e.target.value)}
                  placeholder="Qué trae: telas, colores, para qué ocasión…"
                />
              </div>
              <div className="field">
                <span className="lbl">Foto de portada</span>
                <div className="covers">
                  {covers.map((c) => (
                    <button
                      key={c.path}
                      type="button"
                      aria-pressed={c.path === f.coverPath}
                      aria-label="Usar esta foto"
                      onClick={() => setF((x) => ({ ...x, coverPath: c.path, coverUrl: c.url }))}
                    >
                      <img src={c.url} alt="" />
                    </button>
                  ))}
                  <button
                    type="button"
                    className="up"
                    aria-label="Subir foto"
                    disabled={uploading}
                    onClick={() => fileInput.current?.click()}
                  >
                    {uploading ? "…" : <ImagePlus />}
                  </button>
                  <input
                    ref={fileInput}
                    type="file"
                    hidden
                    accept={ACCEPTED_IMAGE_TYPES.join(",")}
                    onChange={(e) => {
                      void upload(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                </div>
              </div>
              <div className="two">
                <div className="field">
                  <label htmlFor="f-date">Fecha</label>
                  <input
                    className="input"
                    id="f-date"
                    type="date"
                    value={f.date}
                    onChange={(e) => set("date", e.target.value)}
                    disabled={past}
                  />
                </div>
                <div className="field">
                  <label htmlFor="f-time">Hora</label>
                  <input
                    className="input"
                    id="f-time"
                    type="time"
                    value={f.time}
                    onChange={(e) => set("time", e.target.value)}
                    disabled={past}
                  />
                </div>
              </div>
              <div className="field">
                <label htmlFor="f-col">
                  Colección{" "}
                  <small className="muted" style={{ fontWeight: 400 }}>
                    (opcional: en la home se marca como "Próximamente")
                  </small>
                </label>
                <select
                  className="input"
                  id="f-col"
                  value={f.collectionSlug}
                  onChange={(e) => set("collectionSlug", e.target.value)}
                >
                  <option value="">Sin colección</option>
                  {collections.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <span className="lbl">
                  Prendas que salen{" "}
                  <small className="muted" style={{ fontWeight: 400 }}>
                    (las que están en borrador se ven como "Próximamente")
                  </small>
                </span>
                <div className="prods">
                  {products.map((p) => {
                    const on = f.productSlugs.includes(p.slug);
                    return (
                      <button
                        key={p.slug}
                        type="button"
                        aria-pressed={on}
                        onClick={() =>
                          set(
                            "productSlugs",
                            on ? f.productSlugs.filter((s) => s !== p.slug) : [...f.productSlugs, p.slug],
                          )
                        }
                      >
                        {p.images[0] ? <img src={coverOf(p)} alt="" /> : null}
                        {p.name}
                        {p.status === "draft" ? " · borrador" : ""}
                      </button>
                    );
                  })}
                </div>
              </div>
              <label className="switch">
                Mostrar en la home con cuenta regresiva
                <input
                  className="tog"
                  type="checkbox"
                  checked={f.showCountdown}
                  onChange={(e) => set("showCountdown", e.target.checked)}
                />
              </label>
              <label className="switch">
                Avisar a los anotados 1 hora antes
                <input
                  className="tog"
                  type="checkbox"
                  checked={f.notifyBefore}
                  onChange={(e) => set("notifyBefore", e.target.checked)}
                />
              </label>
              <label className="switch">
                Publicar las prendas solas a la hora indicada
                <input
                  className="tog"
                  type="checkbox"
                  checked={f.autoPublish}
                  onChange={(e) => set("autoPublish", e.target.checked)}
                />
              </label>
              <div className="social">
                <b style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <BrandIcon name="instagram" className="i-sm" /> Texto para el adelanto en redes
                </b>
                <textarea
                  className="input"
                  rows={2}
                  value={social}
                  onChange={(e) => setF((x) => ({ ...x, socialText: e.target.value, socialTouched: true }))}
                />
                <button
                  type="button"
                  className="link"
                  style={{ justifySelf: "start", fontSize: 13 }}
                  onClick={() =>
                    navigator.clipboard?.writeText(social).then(
                      () => toast("Texto copiado para Instagram"),
                      () => toast("No se pudo copiar"),
                    )
                  }
                >
                  Copiar texto
                </button>
              </div>
            </div>
            <aside className="ed-prev">
              <span className="eyebrow is-in">Así se ve en la home</span>
              <div className="ed-card">
                {f.coverUrl ? (
                  <img src={f.coverUrl} alt="" />
                ) : (
                  <div style={{ aspectRatio: "4/3", background: "var(--cacao-2)" }} />
                )}
                <div>
                  <span className="eyebrow is-in">Próximo lanzamiento · {when}</span>
                  <b>{f.title || "Nombre del lanzamiento"}</b>
                  <p>{f.teaser || "El adelanto que va a leer la gente."}</p>
                </div>
              </div>
            </aside>
          </div>
          {error && (
            <p className="ln-error" role="alert">
              {error}
            </p>
          )}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="submit" className="btn" disabled={saving}>
              {saving
                ? "Guardando…"
                : editing && launch?.state !== "draft"
                  ? "Guardar cambios"
                  : "Programar lanzamiento"}
            </button>
            {(!editing || launch?.state === "draft") && (
              <button type="button" className="btn btn-ghost" disabled={saving} onClick={() => save("draft")}>
                Guardar como borrador
              </button>
            )}
          </div>
        </form>
      </div>
    </>
  );
}

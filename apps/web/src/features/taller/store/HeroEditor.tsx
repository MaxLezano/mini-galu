"use client";

import { ACCEPTED_IMAGE_TYPES, type AdminHome, HomeHeroInputSchema, MAX_IMAGE_BYTES } from "@mini-galu/contracts";
import { Check, ImagePlus, Undo2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "@/features/shell/ui-store";
import { adminApi } from "@/lib/admin-api";
import { ApiRequestError } from "@/lib/api";
import { Emphasis } from "@/ui/atoms/Emphasis";

type Form = {
  eyebrow: string;
  title: string;
  lead: string;
  ctaLabel: string;
  imagePath: string;
  imageUrl: string;
  imageAlt: string;
  announcements: string;
};

const SEP = " · ";
const toForm = (h: AdminHome): Form => ({
  eyebrow: h.hero.eyebrow,
  title: h.hero.titleLines.join("\n"),
  lead: h.hero.lead,
  ctaLabel: h.hero.ctaLabel,
  imagePath: h.hero.imagePath,
  imageUrl: h.heroImageUrl,
  imageAlt: h.hero.imageAlt,
  announcements: h.announcements.join(SEP),
});

/** Portada de la tienda con vista previa en vivo (mockup admin-tienda.html → #home). */
export function HeroEditor({ initial }: { initial: AdminHome }) {
  const [saved, setSaved] = useState(initial);
  const [f, setF] = useState(() => toForm(initial));
  const [options, setOptions] = useState(initial.imageOptions);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }));
  const lines = f.title
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const dirty = JSON.stringify(f) !== JSON.stringify(toForm(saved));

  const upload = async (file: File | undefined) => {
    if (!file) return;
    if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) return toast("Subí WebP, JPG, PNG o AVIF");
    if (file.size > MAX_IMAGE_BYTES) return toast("La foto pesa más de 8 MB");
    try {
      const r = await adminApi.uploadImage(file, "content");
      setOptions((o) => [r, ...o]);
      setF((x) => ({ ...x, imagePath: r.path, imageUrl: r.url }));
    } catch (e) {
      toast(e instanceof ApiRequestError ? e.message : "No se pudo subir la foto");
    }
  };

  const save = async () => {
    const input = {
      hero: {
        eyebrow: f.eyebrow,
        titleLines: lines,
        lead: f.lead,
        ctaLabel: f.ctaLabel,
        imagePath: f.imagePath,
        imageAlt: f.imageAlt,
      },
      announcements: f.announcements
        .split("·")
        .map((a) => a.trim())
        .filter(Boolean),
    };
    const check = HomeHeroInputSchema.safeParse(input);
    if (!check.success) return setError(check.error.issues[0]?.message ?? "Revisá los datos");
    setBusy(true);
    setError(null);
    try {
      const r = await adminApi.saveHome(check.data);
      setSaved(r);
      setF(toForm(r));
      toast("Portada publicada en la tienda", { icon: <Check className="i-sm" /> });
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="box" id="home">
      <div className="box-head">
        <h2>Portada de la tienda</h2>
        <a className="link" href="/" target="_blank" rel="noopener" style={{ fontSize: 13 }}>
          Ver
        </a>
      </div>
      <div className="stack">
        <div className="hero-prev">
          <img src={f.imageUrl} alt="" />
          <div>
            <span className="eyebrow is-in">{f.eyebrow}</span>
            <b className="hp-title">
              {lines.map((l) => (
                <span key={l} style={{ display: "block" }}>
                  <Emphasis text={l} />
                </span>
              ))}
            </b>
            <p>{f.lead}</p>
            <span className="hp-btn">{f.ctaLabel}</span>
          </div>
        </div>
        <div className="field">
          <span className="lbl">Foto principal</span>
          <div className="heroes">
            {options.map((o) => (
              <button
                key={o.path}
                type="button"
                aria-pressed={o.path === f.imagePath}
                aria-label="Usar esta foto"
                onClick={() => setF((x) => ({ ...x, imagePath: o.path, imageUrl: o.url }))}
              >
                <img src={o.url} alt="" />
              </button>
            ))}
            <button type="button" className="up" aria-label="Subir foto" onClick={() => fileInput.current?.click()}>
              <ImagePlus />
              <small>Subir foto</small>
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
            <label htmlFor="he">Etiqueta</label>
            <input
              className="input"
              id="he"
              value={f.eyebrow}
              maxLength={40}
              onChange={(e) => set("eyebrow", e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="hb">Texto del botón</label>
            <input
              className="input"
              id="hb"
              value={f.ctaLabel}
              maxLength={30}
              onChange={(e) => set("ctaLabel", e.target.value)}
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="ht">
            Título{" "}
            <small className="muted" style={{ fontWeight: 400 }}>
              (una línea por renglón; *entre asteriscos* va en itálica)
            </small>
          </label>
          <textarea className="input" id="ht" rows={3} value={f.title} onChange={(e) => set("title", e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="hs">Bajada</label>
          <textarea
            className="input"
            id="hs"
            rows={2}
            value={f.lead}
            maxLength={220}
            onChange={(e) => set("lead", e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="ha">Descripción de la foto (para lectores de pantalla y Google)</label>
          <input
            className="input"
            id="ha"
            value={f.imageAlt}
            maxLength={140}
            onChange={(e) => set("imageAlt", e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="ann">
            Barra de anuncios{" "}
            <small className="muted" style={{ fontWeight: 400 }}>
              (separá cada mensaje con ·)
            </small>
          </label>
          <input
            className="input"
            id="ann"
            value={f.announcements}
            onChange={(e) => set("announcements", e.target.value)}
          />
        </div>
        {error && (
          <p className="st-error" role="alert">
            {error}
          </p>
        )}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" className="btn btn-sm" disabled={busy || !dirty} onClick={save}>
            {busy ? "Guardando…" : "Guardar portada"}
          </button>
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            disabled={!dirty}
            onClick={() => {
              setF(toForm(saved));
              setError(null);
              toast("Cambios descartados", { icon: <Undo2 className="i-sm" /> });
            }}
          >
            Descartar cambios
          </button>
        </div>
      </div>
    </section>
  );
}

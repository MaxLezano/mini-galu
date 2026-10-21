"use client";

import { pointsHint, type ReviewPoints, ReviewPointsSchema } from "@mini-galu/contracts";
import { Check } from "lucide-react";
import { useState } from "react";
import { toast } from "@/features/shell/ui-store";
import { adminApi } from "@/lib/admin-api";
import { ApiRequestError } from "@/lib/api";

type Num = Exclude<keyof ReviewPoints, "enabled">;

const FIELDS: [Num, string][] = [
  ["perReview", "Puntos por reseña"],
  ["perPhoto", "Extra con foto"],
  ["threshold", "Puntos para canjear"],
  ["percent", "Descuento (%)"],
  ["validDays", "Días que vale"],
];

const digits = (s: string) => s.replace(/\D/g, "");

/**
 * Puntos por reseñas (sin mockup: reemplaza el cupón RESENA10 de admin-tienda.html). Suman al publicar la reseña y
 * con el umbral el cliente canjea en Mi cuenta un cupón personal de un solo uso.
 */
export function ReviewPointsEditor({ initial }: { initial: ReviewPoints }) {
  const [saved, setSaved] = useState(initial);
  const [enabled, setEnabled] = useState(initial.enabled);
  const [values, setValues] = useState(
    () => Object.fromEntries(FIELDS.map(([k]) => [k, String(initial[k])])) as Record<Num, string>,
  );
  const [busy, setBusy] = useState(false);

  const draft = { enabled, ...Object.fromEntries(FIELDS.map(([k]) => [k, Number(values[k] || Number.NaN)])) };
  const check = ReviewPointsSchema.safeParse(draft);
  const dirty = JSON.stringify(check.success ? check.data : draft) !== JSON.stringify(saved);
  // cuántas reseñas con foto hacen falta para un canje (lo que más le importa a Gaby)
  const reviews = check.success ? Math.ceil(check.data.threshold / (check.data.perReview + check.data.perPhoto)) : null;

  const save = async () => {
    if (!check.success) {
      const field = check.error.issues[0]?.path[0];
      toast(check.error.issues[0]?.message ?? "Revisá los puntos");
      return document.getElementById(`pts-${String(field)}`)?.focus();
    }
    setBusy(true);
    try {
      const next = (await adminApi.savePolicies({ reviewPoints: check.data })).reviewPoints;
      setSaved(next);
      toast("Puntos por reseñas guardados", { icon: <Check className="i-sm" /> });
    } catch (e) {
      toast(e instanceof ApiRequestError ? e.message : "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="box" id="puntos">
      <div className="box-head">
        <h2>Puntos por reseñas</h2>
        <span className={`pill-status ${saved.enabled ? "st-ok" : "st-muted"}`}>
          {saved.enabled ? "Prendidos" : "Apagados"}
        </span>
      </div>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <label className="switch">
          Sumar puntos por reseñas{" "}
          <input className="tog" type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        </label>
        <div className="pts-grid">
          {FIELDS.map(([k, label]) => (
            <div className="field" key={k}>
              <label htmlFor={`pts-${k}`}>{label}</label>
              <input
                className="input"
                id={`pts-${k}`}
                inputMode="numeric"
                disabled={!enabled}
                value={values[k]}
                onChange={(e) => setValues((v) => ({ ...v, [k]: digits(e.target.value) }))}
              />
            </div>
          ))}
        </div>
        {check.success && (
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>
            Así lo ve el cliente: “{pointsHint(check.data)}”{" "}
            {reviews === 1 ? "Alcanza con 1 reseña publicada con foto" : `Son ${reviews} reseñas publicadas con foto`}{" "}
            por cupón. Solo suman las que publicás; las compras no suman.
          </p>
        )}
        <button type="submit" className="btn btn-sm" style={{ justifySelf: "start" }} disabled={busy || !dirty}>
          {busy ? "Guardando…" : "Guardar"}
        </button>
      </form>
    </section>
  );
}

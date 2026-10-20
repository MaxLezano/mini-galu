"use client";

import { type StorePolicies, WEEKDAYS } from "@mini-galu/contracts";
import { Check } from "lucide-react";
import { useState } from "react";
import { toast } from "@/features/shell/ui-store";
import { adminApi } from "@/lib/admin-api";
import { ApiRequestError } from "@/lib/api";
import { fromForm, type PoliciesForm, toForm } from "./policies-form";

/** Lunes primero, como se lee una semana. */
const WEEK = [1, 2, 3, 4, 5, 6, 0];

type Props = {
  initial: StorePolicies;
  /** Con Andreani conectado, el checkout cotiza con Andreani y la tabla queda de respaldo. */
  andreani: boolean;
  /** Alguna página de ayuda de cambios o envíos tiene texto propio (no se actualiza sola). */
  helpEdited: boolean;
};

/**
 * Entregas y cambios — admin-tienda.html → #envios (envío gratis, formas de entrega y horarios de retiro), más los
 * días de cambio, el envío a acordar y el cadete de la ciudad del taller. Los precios de Andreani los pone Andreani.
 * Lo leen la ficha, la bolsa, el checkout, la ayuda, Galú y los mails.
 */
export function PoliciesEditor({ initial, andreani, helpEdited }: Props) {
  const [saved, setSaved] = useState(initial);
  const [form, setForm] = useState<PoliciesForm>(() => toForm(initial));
  const [error, setError] = useState<{ field: string; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const dirty = JSON.stringify(form) !== JSON.stringify(toForm(saved));
  const shipped = form.methods.domicilio || form.methods.sucursal;

  const save = async () => {
    const r = fromForm(form, saved);
    if ("field" in r) {
      setError(r);
      return document.getElementById(r.field)?.focus();
    }
    setError(null);
    setBusy(true);
    try {
      const next = await adminApi.savePolicies(r.policies);
      setSaved(next);
      setForm(toForm(next));
      toast("Entregas y cambios guardados", { icon: <Check className="i-sm" /> });
    } catch (e) {
      toast(e instanceof ApiRequestError ? e.message : "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  };

  const err = (...fields: string[]) =>
    error && fields.includes(error.field) ? (
      <span className="field-error" role="alert">
        {error.message}
      </span>
    ) : null;
  const method = (k: keyof PoliciesForm["methods"], label: string) => (
    <label className="switch">
      {label}
      <input
        className="tog"
        id={`pol-${k}`}
        type="checkbox"
        checked={form.methods[k]}
        onChange={(e) => setForm((f) => ({ ...f, methods: { ...f.methods, [k]: e.target.checked } }))}
      />
    </label>
  );

  return (
    <section className="box" id="entregas">
      <div className="box-head">
        <h2>Entregas y cambios</h2>
      </div>
      <div className="stack">
        <div className="field">
          <label htmlFor="pol-days">Días para cambiar el talle</label>
          <input
            className="input pol-days"
            id="pol-days"
            inputMode="numeric"
            value={form.exchangeDays}
            onChange={(e) => setForm((f) => ({ ...f, exchangeDays: e.target.value.replace(/\D/g, "") }))}
          />
          <small className="muted">
            Desde que reciben el pedido. Se ve en la ficha, el inicio, el checkout y los mails.
          </small>
          {err("pol-days")}
        </div>

        <h3 className="sh-sub">Formas de entrega</h3>
        {method("domicilio", "Andreani a domicilio")}
        {method("sucursal", "Andreani a sucursal")}
        {method("acordar", "Acordar envío por WhatsApp")}
        {method("taller", "Retiro en el taller")}
        {method("cadete", "Cadete en la ciudad del taller")}
        <small className="muted">
          {andreani
            ? "Andreani cotiza cada envío con sus precios."
            : "Andreani todavía no está conectado: en la tienda publicada sus opciones aparecen cuando se cargan las credenciales."}{" "}
          Acordar envío y cadete no se cobran en la web: se coordinan por WhatsApp.
        </small>
        {err("pol-domicilio")}

        {form.methods.cadete && (
          <fieldset className="pol-zone">
            <legend>Cadete</legend>
            <div className="pol-zone-fields">
              <div className="field pol-zone-cps">
                <label htmlFor="pol-local-cps">Códigos postales a los que llega</label>
                <input
                  className="input"
                  id="pol-local-cps"
                  placeholder="4000"
                  value={form.local.cps}
                  onChange={(e) => setForm((f) => ({ ...f, local: { ...f.local, cps: e.target.value } }))}
                />
              </div>
              <div className="field">
                <label htmlFor="pol-local-from">Desde</label>
                <div className="inline-input">
                  <span>$</span>
                  <input
                    className="input"
                    id="pol-local-from"
                    inputMode="numeric"
                    value={form.local.from}
                    onChange={(e) => setForm((f) => ({ ...f, local: { ...f.local, from: e.target.value } }))}
                  />
                </div>
              </div>
            </div>
            {err("pol-local-cps", "pol-local-from")}
          </fieldset>
        )}

        {form.methods.taller && (
          <fieldset className="pol-hours">
            <legend>Horarios de retiro</legend>
            {WEEK.map((d) => (
              <div key={d} className="pol-hour">
                <label htmlFor={`pol-pickup-${d}`}>{WEEKDAYS[d]}</label>
                <input
                  className="input"
                  id={`pol-pickup-${d}`}
                  placeholder="Cerrado"
                  value={form.pickup[d] ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, pickup: f.pickup.map((t, i) => (i === d ? e.target.value : t)) }))
                  }
                />
              </div>
            ))}
            <small className="muted">Franjas en horas, separadas por coma: 10 a 13, 16 a 19. Vacío es cerrado.</small>
            {err(...WEEK.map((d) => `pol-pickup-${d}`))}
          </fieldset>
        )}

        {shipped && (
          <>
            <h3 className="sh-sub">Envío gratis con Andreani</h3>
            <label className="switch">
              Envío gratis desde un monto
              <input
                className="tog"
                type="checkbox"
                checked={form.freeEnabled}
                onChange={(e) => setForm((f) => ({ ...f, freeEnabled: e.target.checked }))}
              />
            </label>
            {form.freeEnabled && (
              <div className="field">
                <label htmlFor="pol-free">Envío gratis desde</label>
                <div className="inline-input">
                  <span>$</span>
                  <input
                    className="input"
                    id="pol-free"
                    inputMode="numeric"
                    value={form.freeFrom}
                    onChange={(e) => setForm((f) => ({ ...f, freeFrom: e.target.value }))}
                  />
                </div>
                {err("pol-free")}
              </div>
            )}
          </>
        )}

        {helpEdited && (
          <p className="muted" style={{ margin: 0, fontSize: 12.5 }}>
            Editaste las páginas de ayuda de cambios o envíos: revisá que digan lo mismo (el texto de base se actualiza
            solo).
          </p>
        )}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" className="btn" disabled={busy || !dirty} onClick={save}>
            {busy ? "Guardando…" : "Guardar entregas y cambios"}
          </button>
          {dirty && (
            <button
              type="button"
              className="btn btn-ghost"
              disabled={busy}
              onClick={() => {
                setForm(toForm(saved));
                setError(null);
              }}
            >
              Descartar cambios
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

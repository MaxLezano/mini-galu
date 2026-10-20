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
 * días de cambio, las zonas de envío (nombre, códigos postales y tarifas) y la cadetería de la ciudad del taller. Lo
 * leen la ficha, la bolsa, el checkout, la ayuda, Galú y los mails.
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
        {method("domicilio", "Envío a domicilio")}
        {method("sucursal", "Envío a sucursal Andreani")}
        {method("taller", "Retiro en el taller")}
        {err("pol-domicilio")}

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
            <h3 className="sh-sub">Envío gratis</h3>
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

            <h3 className="sh-sub">Zonas de envío</h3>
            <p className="muted" style={{ margin: 0, fontSize: 12.5 }}>
              {andreani
                ? "Con Andreani conectado, el checkout cotiza con Andreani: esta tabla se usa en la ficha y si Andreani no responde."
                : "Las usa el checkout mientras Andreani no esté conectado, y la ficha para calcular el envío."}{" "}
              Cada código postal cae en la primera zona que lo incluye; los que no entran en ninguna van a la última.
            </p>
            {form.zones.map((z, i) => {
              const last = i === form.zones.length - 1;
              const id = (k: string) => `pol-zone-${i}-${k}`;
              const set = (k: keyof typeof z, v: string) =>
                setForm((f) => ({ ...f, zones: f.zones.map((x, j) => (j === i ? { ...x, [k]: v } : x)) }));
              return (
                // biome-ignore lint/suspicious/noArrayIndexKey: las zonas son posiciones fijas de la tabla
                <fieldset key={i} className="pol-zone">
                  <legend>{z.title || `Zona ${i + 1}`}</legend>
                  <div className="pol-zone-fields">
                    <div className="field">
                      <label htmlFor={id("title")}>Nombre</label>
                      <input
                        className="input"
                        id={id("title")}
                        value={z.title}
                        onChange={(e) => set("title", e.target.value)}
                      />
                    </div>
                    <div className="field pol-zone-cps">
                      <label htmlFor={id("cps")}>Códigos postales</label>
                      {last ? (
                        <input className="input" id={id("cps")} value="El resto del país" disabled />
                      ) : (
                        <input
                          className="input"
                          id={id("cps")}
                          placeholder="4000-4199, 4700"
                          value={z.cps}
                          onChange={(e) => set("cps", e.target.value)}
                        />
                      )}
                    </div>
                    <div className="field">
                      <label htmlFor={id("domicilio")}>A domicilio</label>
                      <div className="inline-input">
                        <span>$</span>
                        <input
                          className="input"
                          id={id("domicilio")}
                          inputMode="numeric"
                          value={z.domicilio}
                          onChange={(e) => set("domicilio", e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="field">
                      <label htmlFor={id("sucursal")}>A sucursal</label>
                      <div className="inline-input">
                        <span>$</span>
                        <input
                          className="input"
                          id={id("sucursal")}
                          inputMode="numeric"
                          value={z.sucursal}
                          onChange={(e) => set("sucursal", e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="field">
                      <label htmlFor={id("days")}>Días hábiles</label>
                      <input
                        className="input"
                        id={id("days")}
                        placeholder="2 a 3"
                        value={z.days}
                        onChange={(e) => set("days", e.target.value)}
                      />
                    </div>
                  </div>
                  {err(id("title"), id("cps"), id("domicilio"), id("sucursal"), id("days"))}
                </fieldset>
              );
            })}
          </>
        )}

        <h3 className="sh-sub">Cadetería en la ciudad</h3>
        <label className="switch">
          Ofrecer cadete propio
          <input
            className="tog"
            id="pol-local"
            type="checkbox"
            checked={form.local.enabled}
            onChange={(e) => setForm((f) => ({ ...f, local: { ...f.local, enabled: e.target.checked } }))}
          />
        </label>
        {form.local.enabled && (
          <div className="pol-zone-fields">
            <div className="field pol-zone-cps">
              <label htmlFor="pol-local-cps">Códigos postales</label>
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
        )}
        <small className="muted">
          Se muestra en la ficha y en el checkout con su precio desde y el botón para coordinarlo por WhatsApp. No se
          cobra en la web.
        </small>
        {err("pol-local-cps", "pol-local-from")}

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

"use client";

import { type StorePolicies, StorePoliciesSchema } from "@mini-galu/contracts";
import { Check } from "lucide-react";
import { useState } from "react";
import { toast } from "@/features/shell/ui-store";
import { adminApi } from "@/lib/admin-api";
import { ApiRequestError } from "@/lib/api";

type Info = Pick<StorePolicies, "contact" | "workshop">;

const FIELDS = [
  ["contact", "whatsapp", "WhatsApp", "381 319-5264", "El de los botones de la tienda, los mails y Galú."],
  ["contact", "email", "Email", "mini.galu.store@gmail.com", "Contacto de la tienda y a donde te llegan los avisos."],
  ["contact", "instagram", "Instagram", "minigalumodainfantil", "Solo el usuario, sin @."],
  ["workshop", "city", "Localidad del taller", "San Miguel de Tucumán", "Donde se retiran los pedidos."],
  ["workshop", "province", "Provincia del taller", "Tucumán", null],
] as const;

/** Datos de la tienda (sin mockup): contacto y taller. Los usan el pie, la ayuda, el checkout, los mails y Galú. */
export function StoreInfoEditor({ initial }: { initial: StorePolicies }) {
  const pick = (p: StorePolicies): Info => ({ contact: { ...p.contact }, workshop: { ...p.workshop } });
  const [saved, setSaved] = useState(() => pick(initial));
  const [form, setForm] = useState(() => pick(initial));
  const [error, setError] = useState<{ field: string; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const dirty = JSON.stringify(form) !== JSON.stringify(saved);

  const save = async () => {
    const r = StorePoliciesSchema.safeParse({ ...initial, ...form });
    if (!r.success) {
      const issue = r.error.issues[0];
      const field = `info-${String(issue?.path[1] ?? "whatsapp")}`;
      setError({ field, message: issue?.message ?? "Revisá los datos" });
      return document.getElementById(field)?.focus();
    }
    setError(null);
    setBusy(true);
    try {
      const next = pick(await adminApi.savePolicies({ contact: r.data.contact, workshop: r.data.workshop }));
      setSaved(next);
      setForm(next);
      toast("Datos de la tienda guardados", { icon: <Check className="i-sm" /> });
    } catch (e) {
      toast(e instanceof ApiRequestError ? e.message : "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="box" id="datos">
      <div className="box-head">
        <h2>Datos de la tienda</h2>
      </div>
      <div className="stack">
        {FIELDS.map(([group, key, label, placeholder, hint]) => {
          const id = `info-${key}`;
          const value = (form[group] as Record<string, string>)[key] ?? "";
          return (
            <div className="field" key={id}>
              <label htmlFor={id}>{label}</label>
              <input
                className="input"
                id={id}
                placeholder={placeholder}
                value={value}
                inputMode={key === "whatsapp" ? "tel" : key === "email" ? "email" : undefined}
                onChange={(e) => setForm((f) => ({ ...f, [group]: { ...f[group], [key]: e.target.value } }))}
              />
              {hint && <small className="muted">{hint}</small>}
              {error?.field === id && (
                <span className="field-error" role="alert">
                  {error.message}
                </span>
              )}
            </div>
          );
        })}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" className="btn" disabled={busy || !dirty} onClick={save}>
            {busy ? "Guardando…" : "Guardar datos de la tienda"}
          </button>
          {dirty && (
            <button
              type="button"
              className="btn btn-ghost"
              disabled={busy}
              onClick={() => {
                setForm(saved);
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

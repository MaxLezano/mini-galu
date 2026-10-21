"use client";

import { formatCuit, type StorePolicies, StorePoliciesSchema } from "@mini-galu/contracts";
import { Check } from "lucide-react";
import { Fragment, useState } from "react";
import { toast } from "@/features/shell/ui-store";
import { adminApi } from "@/lib/admin-api";
import { ApiRequestError } from "@/lib/api";

type Info = Pick<StorePolicies, "contact" | "workshop" | "fiscal">;

const FIELDS = [
  ["contact", "whatsapp", "WhatsApp", "381 319-5264", "El de los botones de la tienda, los mails y Galú."],
  ["contact", "email", "Email", "mini.galu.store@gmail.com", "Contacto de la tienda y a donde te llegan los avisos."],
  ["contact", "instagram", "Instagram", "minigalumodainfantil", "Solo el usuario, sin @."],
  ["workshop", "city", "Localidad del taller", "San Miguel de Tucumán", "Donde se retiran los pedidos."],
  ["workshop", "province", "Provincia del taller", "Tucumán", null],
  ["fiscal", "name", "Nombre o razón social", "Nombre y apellido", "Como figura en ARCA."],
  ["fiscal", "address", "Domicilio comercial", "Calle, número y localidad", null],
  ["fiscal", "iibb", "Ingresos Brutos", "Número de inscripción o Exento", null],
  ["fiscal", "activitiesSince", "Inicio de actividades", "", null],
  [
    "fiscal",
    "dataFiscalUrl",
    "Data Fiscal (formulario 960)",
    "http://qr.afip.gob.ar/?qr=…",
    "Pegá el link o el código que te da ARCA en Data Fiscal: va como QR en el pie de la tienda.",
  ],
] as const;

/**
 * Datos de la tienda (sin mockup): contacto y taller (los usan el pie, la ayuda, el checkout, los mails y Galú) y los
 * datos fiscales que van impresos en las facturas y en el pie. El CUIT y el punto de venta son los del certificado de
 * ARCA: el CUIT se muestra, no se edita.
 */
export function StoreInfoEditor({ initial }: { initial: StorePolicies }) {
  const pick = (p: StorePolicies): Info => ({
    contact: { ...p.contact },
    workshop: { ...p.workshop },
    fiscal: { ...p.fiscal },
  });
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
      const next = pick(
        await adminApi.savePolicies({ contact: r.data.contact, workshop: r.data.workshop, fiscal: r.data.fiscal }),
      );
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
            <Fragment key={id}>
              {group === "fiscal" && key === "name" && (
                <>
                  <h3 className="sh-sub">Datos fiscales · van en cada factura y en el pie de la tienda</h3>
                  <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                    {form.fiscal.cuit
                      ? `CUIT ${formatCuit(form.fiscal.cuit)} (el del certificado de ARCA).`
                      : "El CUIT sale del certificado de ARCA: se carga en el servidor (paso 9 de la puesta en marcha)."}
                  </p>
                </>
              )}
              <div className="field">
                <label htmlFor={id}>{label}</label>
                <input
                  className="input"
                  id={id}
                  placeholder={placeholder}
                  value={value}
                  type={key === "activitiesSince" ? "date" : undefined}
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
            </Fragment>
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

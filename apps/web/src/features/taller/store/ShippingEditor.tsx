"use client";

import {
  type AdminShipping,
  PACKAGE_PRESETS,
  type PackagePreset,
  type ShippingSettings,
  ShippingSettingsSchema,
} from "@mini-galu/contracts";
import { Check, Truck } from "lucide-react";
import { useState } from "react";
import { toast } from "@/features/shell/ui-store";
import { adminApi } from "@/lib/admin-api";
import { ApiRequestError } from "@/lib/api";

const MODE: Record<AdminShipping["andreani"]["mode"], { title: string; text: string; pill: string; tone: string }> = {
  simulado: {
    title: "Andreani sin conectar",
    text: "Modo simulado: cotiza con una tabla por zona y genera seguimientos de prueba. Cuando Andreani te dé las credenciales de la API (usuario, contraseña, cliente y contratos), se cargan en el .env de la API.",
    pill: "Simulado",
    tone: "st-muted",
  },
  qa: {
    title: "Andreani conectado (pruebas)",
    text: "Ambiente de pruebas de Andreani: las etiquetas y los envíos no son reales.",
    pill: "Prueba",
    tone: "st-warn",
  },
  produccion: {
    title: "Andreani conectado",
    text: "Producción: cada etiqueta da de alta un envío real en tu cuenta de Andreani.",
    pill: "Activo",
    tone: "st-ok",
  },
};

const EMPTY: ShippingSettings = {
  package: "bolsa",
  origin: { street: "", number: "", unit: null, city: "", province: "CABA", postalCode: "" },
  sender: { name: "Mini Galú", phone: "", email: "", taxId: null },
};

/** Envíos — admin-tienda.html → #envios. Andreani necesita desde dónde sale el paquete, quién lo manda y su tamaño. */
export function ShippingEditor({ initial }: { initial: AdminShipping }) {
  const [form, setForm] = useState<ShippingSettings>(initial.settings ?? EMPTY);
  const [saved, setSaved] = useState(initial.settings !== null);
  const [error, setError] = useState<{ field: string; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const mode = MODE[initial.andreani.mode];

  const set = <G extends "origin" | "sender">(group: G, k: keyof ShippingSettings[G], v: string) =>
    setForm((f) => ({ ...f, [group]: { ...f[group], [k]: v } }));

  const save = async () => {
    const r = ShippingSettingsSchema.safeParse(form);
    if (!r.success) {
      const i = r.error.issues[0];
      const field = i?.path.join("-") ?? "";
      setError({ field, message: i?.message ?? "Revisá los datos" });
      return document.getElementById(`sh-${field}`)?.focus();
    }
    setError(null);
    setBusy(true);
    try {
      const res = await adminApi.saveShipping(r.data);
      if (res.settings) setForm(res.settings);
      setSaved(true);
      toast("Datos de envío guardados", { icon: <Check className="i-sm" /> });
    } catch (e) {
      toast(e instanceof ApiRequestError ? e.message : "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  };

  const err = (field: string) =>
    error?.field === field ? (
      <span className="field-error" role="alert">
        {error.message}
      </span>
    ) : null;
  const input = (
    group: "origin" | "sender",
    k: string,
    label: string,
    extra: { inputMode?: "numeric" | "tel" | "email"; optional?: boolean } = {},
  ) => {
    const id = `sh-${group}-${k}`;
    const value = (form[group] as Record<string, string | null>)[k] ?? "";
    return (
      <div className="field">
        <label htmlFor={id}>
          {label}
          {extra.optional && (
            <small className="muted" style={{ fontWeight: 400 }}>
              {" "}
              (opcional)
            </small>
          )}
        </label>
        <input
          className="input"
          id={id}
          inputMode={extra.inputMode}
          value={value}
          onChange={(e) =>
            set(group, k as never, extra.optional && !e.target.value.trim() ? (null as never) : e.target.value)
          }
        />
        {err(`${group}-${k}`)}
      </div>
    );
  };

  return (
    <section className="box" id="envios">
      <div className="box-head">
        <h2>Envíos</h2>
        <span className={`pill-status ${mode.tone}`}>{mode.pill}</span>
      </div>
      <div className="stack">
        <div className="conn">
          <span className="ic">
            <Truck />
          </span>
          <div>
            <b>{mode.title}</b>
            <span className="muted">{mode.text}</span>
          </div>
        </div>
        {!saved && (
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>
            Completá desde dónde sale el paquete y quién lo manda: Andreani lo pide para generar las etiquetas.
          </p>
        )}

        <div className="field">
          <label htmlFor="sh-package">Paquete por defecto</label>
          <select
            className="input"
            id="sh-package"
            value={form.package}
            onChange={(e) => setForm((f) => ({ ...f, package: e.target.value as PackagePreset }))}
          >
            {(Object.keys(PACKAGE_PRESETS) as PackagePreset[]).map((k) => (
              <option key={k} value={k}>
                {PACKAGE_PRESETS[k].label}
              </option>
            ))}
          </select>
        </div>

        <h3 className="sh-sub">Sale desde</h3>
        <div className="two">
          {input("origin", "street", "Calle")}
          {input("origin", "number", "Altura", { inputMode: "numeric" })}
        </div>
        <div className="two">
          {input("origin", "unit", "Piso / depto", { optional: true })}
          {input("origin", "postalCode", "Código postal", { inputMode: "numeric" })}
        </div>
        <div className="two">
          {input("origin", "city", "Localidad")}
          {input("origin", "province", "Provincia")}
        </div>

        <h3 className="sh-sub">Remitente</h3>
        <div className="two">
          {input("sender", "name", "Nombre o razón social")}
          {input("sender", "taxId", "CUIT o DNI", { inputMode: "numeric", optional: true })}
        </div>
        <div className="two">
          {input("sender", "phone", "Teléfono", { inputMode: "tel" })}
          {input("sender", "email", "Email", { inputMode: "email" })}
        </div>

        {/* TODO(fase 10 · shipping): envío gratis desde un monto, formas de entrega y horarios de retiro editables */}
        <p className="muted" style={{ margin: 0, fontSize: 12.5 }}>
          Envío gratis desde $90.000, formas de entrega y horarios de retiro: por ahora son fijos.
        </p>
        <button type="button" className="btn" disabled={busy} onClick={save} style={{ justifySelf: "start" }}>
          {busy ? "Guardando…" : "Guardar datos de envío"}
        </button>
      </div>
    </section>
  );
}

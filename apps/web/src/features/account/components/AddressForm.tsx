"use client";

import { type AccountAddress, type AddressInput, AddressInputSchema, PROVINCES } from "@mini-galu/contracts";
import { useState } from "react";

type Props = {
  initial: AccountAddress | null;
  /** Provincia del taller: la más probable para una dirección nueva. */
  defaultProvince: string;
  busy: boolean;
  onSave: (a: AddressInput) => void;
  onCancel: () => void;
};

/** Agregar o editar una dirección guardada (la usa el checkout para no volver a escribirla). */
export function AddressForm({ initial, defaultProvince, busy, onSave, onCancel }: Props) {
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="acc-form"
      style={{ marginBottom: 16 }}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const v = (k: string) => String(fd.get(k) ?? "").trim();
        const r = AddressInputSchema.safeParse({
          label: v("label") || "Casa",
          street: v("street"),
          number: v("number"),
          unit: v("unit") || null,
          city: v("city"),
          province: v("province"),
          postalCode: v("postalCode").toUpperCase(),
          notes: v("notes") || null,
          isDefault: fd.get("isDefault") === "on",
        });
        if (!r.success) return setError(r.error.issues[0]?.message ?? "Revisá la dirección");
        setError(null);
        onSave(r.data);
      }}
    >
      <div className="two">
        <div className="field">
          <label htmlFor="ad-label">Nombre</label>
          <input className="input" id="ad-label" name="label" placeholder="Casa" defaultValue={initial?.label} />
        </div>
        <div className="field">
          <label htmlFor="ad-cp">Código postal</label>
          <input
            className="input"
            id="ad-cp"
            name="postalCode"
            inputMode="numeric"
            defaultValue={initial?.postalCode}
          />
        </div>
      </div>
      <div className="two">
        <div className="field">
          <label htmlFor="ad-street">Calle</label>
          <input className="input" id="ad-street" name="street" defaultValue={initial?.street} />
        </div>
        <div className="two" style={{ gap: 12 }}>
          <div className="field">
            <label htmlFor="ad-number">Altura</label>
            <input className="input" id="ad-number" name="number" defaultValue={initial?.number} />
          </div>
          <div className="field">
            <label htmlFor="ad-unit">Piso / depto</label>
            <input className="input" id="ad-unit" name="unit" defaultValue={initial?.unit ?? ""} />
          </div>
        </div>
      </div>
      <div className="two">
        <div className="field">
          <label htmlFor="ad-city">Localidad</label>
          <input className="input" id="ad-city" name="city" defaultValue={initial?.city} />
        </div>
        <div className="field">
          <label htmlFor="ad-province">Provincia</label>
          <select
            className="input"
            id="ad-province"
            name="province"
            defaultValue={initial?.province ?? defaultProvince}
          >
            {PROVINCES.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="field">
        <label htmlFor="ad-notes">Indicaciones para la entrega</label>
        <input
          className="input"
          id="ad-notes"
          name="notes"
          placeholder="Ej. casa blanca con portón negro"
          defaultValue={initial?.notes ?? ""}
        />
      </div>
      <label className="check">
        <input type="checkbox" name="isDefault" defaultChecked={initial?.isDefault ?? false} /> Usarla por defecto
      </label>
      {error && (
        <span className="field-error" role="alert">
          {error}
        </span>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <button type="submit" className="btn" disabled={busy}>
          {busy ? "Guardando…" : "Guardar dirección"}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

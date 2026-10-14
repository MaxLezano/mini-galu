"use client";

import { type AccountChild, type ChildInput, ChildInputSchema, GARMENT_SIZES, sizeLabel } from "@mini-galu/contracts";
import { useState } from "react";
import { Modal } from "@/ui/organisms/Modal";

export const CHILD_MODAL = "m-nena";

type Props = {
  editing: AccountChild | null;
  busy: boolean;
  onSave: (c: ChildInput) => void;
};

/** Agregar o editar una nena — cuenta.html → #m-nena */
export function ChildModal({ editing, busy, onSave }: Props) {
  const [error, setError] = useState<string | null>(null);
  return (
    <Modal
      id={CHILD_MODAL}
      label={editing ? "Editar nena" : "Agregar nena"}
      title={
        <>
          {editing ? "Editar" : "Agregar"} <em>nena</em>
        </>
      }
    >
      <form
        key={editing?.id ?? "nueva"}
        className="modal-body"
        style={{ display: "grid", gap: 14 }}
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const height = String(fd.get("height") ?? "").trim();
          const r = ChildInputSchema.safeParse({
            name: fd.get("name"),
            birthday: String(fd.get("birthday") ?? "") || null,
            size: String(fd.get("size") ?? "") || null,
            heightCm: height ? Number(height) : null,
          });
          if (!r.success) return setError(r.error.issues[0]?.message ?? "Revisá los datos");
          setError(null);
          onSave(r.data);
        }}
      >
        <div className="field">
          <label htmlFor="nn">Nombre</label>
          <input className="input" id="nn" name="name" required placeholder="Ej. Juana" defaultValue={editing?.name} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div className="field">
            <label htmlFor="nb">Cumpleaños</label>
            <input className="input" id="nb" name="birthday" type="date" defaultValue={editing?.birthday ?? ""} />
          </div>
          <div className="field">
            <label htmlFor="ns">Talle actual</label>
            <select className="input" id="ns" name="size" defaultValue={editing?.size ?? "4"}>
              {GARMENT_SIZES.map((s) => (
                <option key={s} value={s}>
                  {sizeLabel(s)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="field">
          <label htmlFor="nh">
            Altura <span style={{ fontWeight: 400, color: "var(--cacao-3)" }}>(opcional)</span>
          </label>
          <div style={{ position: "relative" }}>
            <input
              className="input"
              id="nh"
              name="height"
              type="number"
              inputMode="numeric"
              min={40}
              max={180}
              placeholder="Ej. 104"
              defaultValue={editing?.heightCm ?? ""}
              style={{ paddingRight: 52 }}
            />
            <span
              style={{
                position: "absolute",
                right: 18,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--cacao-2)",
                fontSize: 14,
              }}
            >
              cm
            </span>
          </div>
          <small className="muted" style={{ fontSize: 12.5 }}>
            Con la altura te recomendamos mejor el talle de cada modelo.
          </small>
        </div>
        {error && (
          <span className="field-error" role="alert">
            {error}
          </span>
        )}
        <button type="submit" className="btn btn-block" disabled={busy}>
          {busy ? "Guardando…" : "Guardar"}
        </button>
      </form>
    </Modal>
  );
}

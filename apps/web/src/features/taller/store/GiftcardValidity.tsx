"use client";

import { StorePoliciesSchema } from "@mini-galu/contracts";
import { Check } from "lucide-react";
import { useState } from "react";
import { toast } from "@/features/shell/ui-store";
import { adminApi } from "@/lib/admin-api";
import { ApiRequestError } from "@/lib/api";

const monthsSchema = StorePoliciesSchema.shape.giftcardMonths;

/** Cuántos meses vale una gift card: lo leen la página de gift cards, los términos, los mails y el vencimiento. */
export function GiftcardValidity({ initial }: { initial: number }) {
  const [saved, setSaved] = useState(initial);
  const [value, setValue] = useState(String(initial));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const r = monthsSchema.safeParse(Number(value.trim() || Number.NaN));
    if (!r.success) {
      setError(r.error.issues[0]?.message ?? "Revisá los meses");
      return document.getElementById("gc-months")?.focus();
    }
    setError(null);
    setBusy(true);
    try {
      const next = await adminApi.savePolicies({ giftcardMonths: r.data });
      setSaved(next.giftcardMonths);
      setValue(String(next.giftcardMonths));
      toast("Vigencia de las gift cards guardada", { icon: <Check className="i-sm" /> });
    } catch (e) {
      toast(e instanceof ApiRequestError ? e.message : "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="field" style={{ marginBottom: 16 }}>
      <label htmlFor="gc-months">Meses que vale desde que se activa</label>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <input
          className="input pol-days"
          id="gc-months"
          inputMode="numeric"
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))}
        />
        <button type="button" className="btn btn-sm" disabled={busy || value === String(saved)} onClick={save}>
          {busy ? "Guardando…" : "Guardar"}
        </button>
      </div>
      <small className="muted">Se ve en la página de gift cards, en los términos y en el mail con el código.</small>
      {error && (
        <span className="field-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

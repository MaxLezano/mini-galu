"use client";

import {
  type AdminCoupon,
  COUPON_AUDIENCES,
  type CouponAudience,
  type CouponInput,
  CouponInputSchema,
  type CouponKind,
  couponLabel,
  formatARS,
} from "@mini-galu/contracts";
import { Pencil, TicketPercent, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast, useUi } from "@/features/shell/ui-store";
import { adminApi } from "@/lib/admin-api";
import { ApiRequestError } from "@/lib/api";
import { Modal } from "@/ui/organisms/Modal";

type Form = {
  code: string;
  kind: CouponKind;
  value: string;
  min: string;
  audience: CouponAudience;
  end: string;
  limit: string;
  once: boolean;
  active: boolean;
};

const EMPTY: Form = {
  code: "",
  kind: "percent",
  value: "10",
  min: "",
  audience: "todos",
  end: "",
  limit: "",
  once: true,
  active: true,
};

const digits = (s: string) => s.replace(/\D/g, "");
/** Fecha del input (AAAA-MM-DD) ↔ fin de ese día en Argentina. */
const endOfDay = (d: string) => `${d}T23:59:59-03:00`;
const toDateInput = (iso: string) => new Date(new Date(iso).getTime() - 3 * 3600_000).toISOString().slice(0, 10);

function toForm(c: AdminCoupon): Form {
  return {
    code: c.code,
    kind: c.kind,
    value: c.kind === "fixed" ? String(c.value / 100) : String(c.value),
    min: c.minSubtotalCents ? String(c.minSubtotalCents / 100) : "",
    audience: c.audience,
    end: c.endsAt ? toDateInput(c.endsAt) : "",
    limit: c.maxUses ? String(c.maxUses) : "",
    once: c.oncePerCustomer,
    active: c.active,
  };
}

function toInput(f: Form): CouponInput {
  const v = Number(digits(f.value)) || 0;
  return {
    code: f.code,
    kind: f.kind,
    value: f.kind === "fixed" ? v * 100 : f.kind === "percent" ? v : 0,
    minSubtotalCents: digits(f.min) ? Number(digits(f.min)) * 100 : null,
    audience: f.audience,
    endsAt: f.end ? endOfDay(f.end) : null,
    maxUses: digits(f.limit) ? Number(digits(f.limit)) : null,
    oncePerCustomer: f.once,
    active: f.active,
  };
}

const MODAL = "m-cp";

/** Cupones — admin-tienda.html → #cupones y modal #m-cp. */
export function CouponsEditor({ initial }: { initial: AdminCoupon[] }) {
  const [coupons, setCoupons] = useState(initial);
  const [editing, setEditing] = useState<AdminCoupon | null>(null);
  const [f, setF] = useState<Form>(EMPTY);
  const [busy, setBusy] = useState(false);
  const { openModal, closeModal } = useUi();
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }));

  const open = (c: AdminCoupon | null) => {
    setEditing(c);
    setF(c ? toForm(c) : EMPTY);
    openModal(MODAL);
    setTimeout(() => document.getElementById("cp-code")?.focus(), 300);
  };

  const replace = (c: AdminCoupon) => setCoupons((list) => list.map((x) => (x.id === c.id ? c : x)));

  const save = async () => {
    const input = toInput(f);
    const check = CouponInputSchema.safeParse(input);
    if (!check.success)
      return toast(check.error.issues[0]?.message ?? "Revisá el cupón", { icon: <TicketPercent className="i-sm" /> });
    setBusy(true);
    try {
      if (editing) {
        replace(await adminApi.updateCoupon(editing.id, input));
        toast(`${check.data.code} actualizado`, { icon: <TicketPercent className="i-sm" /> });
      } else {
        const c = await adminApi.createCoupon(input);
        setCoupons((list) => [c, ...list]);
        toast(`Cupón ${c.code} creado`, { icon: <TicketPercent className="i-sm" /> });
      }
      closeModal();
    } catch (e) {
      toast(e instanceof ApiRequestError ? e.message : "No se pudo guardar", {
        icon: <TicketPercent className="i-sm" />,
      });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!editing || !confirm(`¿Eliminar ${editing.code}?`)) return;
    try {
      await adminApi.deleteCoupon(editing.id);
      setCoupons((list) => list.filter((c) => c.id !== editing.id));
      closeModal();
      toast(`${editing.code} eliminado`, { icon: <Trash2 className="i-sm" /> });
    } catch (e) {
      toast(e instanceof ApiRequestError ? e.message : "No se pudo eliminar");
    }
  };

  const setActive = async (c: AdminCoupon, active: boolean) => {
    replace({ ...c, active });
    try {
      replace(await adminApi.setCouponActive(c.id, active));
      toast(active ? "Cupón activado" : "Cupón pausado", { icon: <TicketPercent className="i-sm" /> });
    } catch {
      replace(c);
      toast("No se pudo cambiar");
    }
  };

  return (
    <section className="box" id="cupones">
      <div className="box-head">
        <h2>Cupones</h2>
        <button type="button" className="btn btn-xs" onClick={() => open(null)}>
          + Nuevo cupón
        </button>
      </div>
      {coupons.length ? (
        <div className="tbl-wrap">
          <table className="t stack">
            <thead>
              <tr>
                <th>Código</th>
                <th>Descuento</th>
                <th className="num">Usos</th>
                <th>Activo</th>
                <th />
              </tr>
            </thead>
            <tbody id="cp-rows">
              {coupons.map((c) => (
                <tr key={c.id} onClick={() => open(c)}>
                  <td>
                    <b>{c.code}</b>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {COUPON_AUDIENCES[c.audience]}
                      {c.endsAt ? ` · vence ${toDateInput(c.endsAt).split("-").reverse().slice(0, 2).join("/")}` : ""}
                      {c.minSubtotalCents ? ` · desde ${formatARS(c.minSubtotalCents)}` : ""}
                    </div>
                  </td>
                  <td data-l="Descuento">{couponLabel(c, formatARS)}</td>
                  <td className="num" data-l="Usos">
                    {c.timesUsed}
                    {c.maxUses ? ` / ${c.maxUses}` : ""}
                  </td>
                  <td data-l="Activo" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                    <input
                      className="tog"
                      type="checkbox"
                      checked={c.active}
                      aria-label={`${c.code} activo`}
                      onChange={(e) => setActive(c, e.target.checked)}
                    />
                  </td>
                  <td>
                    <button type="button" className="icon-btn cp-edit" aria-label={`Editar ${c.code}`}>
                      <Pencil className="i-sm" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="muted" style={{ margin: 0 }}>
          Todavía no hay cupones.
        </p>
      )}

      <Modal
        id={MODAL}
        label="Cupón"
        title={
          editing ? (
            <>
              Editar <em>{editing.code}</em>
            </>
          ) : (
            <>
              Nuevo <em>cupón</em>
            </>
          )
        }
      >
        <form
          className="modal-body"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <div className="field">
            <label htmlFor="cp-code">Código</label>
            <input
              className="input"
              id="cp-code"
              required
              maxLength={20}
              placeholder="Ej. PRIMAVERA15"
              style={{ textTransform: "uppercase", letterSpacing: ".06em" }}
              value={f.code}
              onChange={(e) => set("code", e.target.value)}
            />
          </div>
          <div className="field">
            <span className="lbl">Tipo de descuento</span>
            <div className="seg-btns" role="group">
              {(
                [
                  ["percent", "Porcentaje"],
                  ["fixed", "Monto fijo"],
                  ["free_shipping", "Envío gratis"],
                ] as const
              ).map(([k, label]) => (
                <button type="button" key={k} aria-pressed={f.kind === k} onClick={() => set("kind", k)}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="two">
            {f.kind !== "free_shipping" && (
              <div className="field">
                <label htmlFor="cp-val">Valor</label>
                <div className="inline-input">
                  <span>{f.kind === "percent" ? "%" : "$"}</span>
                  <input
                    className="input"
                    id="cp-val"
                    inputMode="numeric"
                    value={f.value}
                    onChange={(e) => set("value", e.target.value)}
                  />
                </div>
              </div>
            )}
            <div className="field">
              <label htmlFor="cp-min">Compra mínima</label>
              <div className="inline-input">
                <span>$</span>
                <input
                  className="input"
                  id="cp-min"
                  inputMode="numeric"
                  placeholder="Sin mínimo"
                  value={f.min}
                  onChange={(e) => set("min", e.target.value)}
                />
              </div>
            </div>
          </div>
          <div className="field">
            <label htmlFor="cp-who">Para quién</label>
            <select
              className="input"
              id="cp-who"
              value={f.audience}
              onChange={(e) => set("audience", e.target.value as CouponAudience)}
            >
              {Object.entries(COUPON_AUDIENCES).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="two">
            <div className="field">
              <label htmlFor="cp-end">Vence</label>
              <input
                className="input"
                id="cp-end"
                type="date"
                value={f.end}
                onChange={(e) => set("end", e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="cp-lim">Usos máximos</label>
              <input
                className="input"
                id="cp-lim"
                type="number"
                min={1}
                placeholder="Sin límite"
                value={f.limit}
                onChange={(e) => set("limit", e.target.value)}
              />
            </div>
          </div>
          <label className="switch">
            Un uso por cliente{" "}
            <input className="tog" type="checkbox" checked={f.once} onChange={(e) => set("once", e.target.checked)} />
          </label>
          <label className="switch">
            Activo{" "}
            <input
              className="tog"
              type="checkbox"
              checked={f.active}
              onChange={(e) => set("active", e.target.checked)}
            />
          </label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="submit" className="btn" disabled={busy}>
              {editing ? "Guardar cambios" : "Crear cupón"}
            </button>
            {editing && (
              <button type="button" className="btn btn-ghost" onClick={remove}>
                Eliminar
              </button>
            )}
          </div>
        </form>
      </Modal>
    </section>
  );
}

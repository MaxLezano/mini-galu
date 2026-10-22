"use client";

import type { AdminExchange, AdminOrderItem, ExchangeInput } from "@mini-galu/contracts";
import { ArrowLeftRight } from "lucide-react";
import { useState } from "react";

type Props = {
  exchange: AdminExchange;
  items: AdminOrderItem[];
  busy: boolean;
  /** Por qué no salió el último intento (queda a la vista). */
  error?: string | null;
  onConfirm: (input: ExchangeInput) => void;
};

/**
 * Cambio de talle de una prenda del pedido (sin mockup: lenguaje del reintegro del detalle). Primero un botón; al
 * tocarlo, la prenda, el talle nuevo (con su stock), cuántas, si la devuelta vuelve al stock y el motivo.
 */
export function ExchangePanel({ exchange, items, busy, error, onConfirm }: Props) {
  const [open, setOpen] = useState(false);
  const [itemId, setItemId] = useState(items[0]?.id ?? "");
  const [size, setSize] = useState("");
  const [qty, setQty] = useState(1);
  const [restock, setRestock] = useState(exchange.restockSuggested);
  const [reason, setReason] = useState("");
  const item = items.find((i) => i.id === itemId);
  const sizes = exchange.items.find((x) => x.itemId === itemId)?.sizes ?? [];
  const available = sizes.find((s) => s.size === size)?.stock ?? 0;

  if (!open)
    return (
      <div className="od-refund-cta">
        <button type="button" className="btn btn-sm btn-ghost" onClick={() => setOpen(true)}>
          <ArrowLeftRight className="i-sm" /> Cambiar talle
        </button>
      </div>
    );

  return (
    <section className="od-refund" aria-label="Cambiar talle">
      <b>
        <ArrowLeftRight className="i-sm" /> Cambiar talle
      </b>
      <div className="od-exchange-row">
        {items.length > 1 && (
          <select
            className="input"
            aria-label="Prenda"
            value={itemId}
            onChange={(e) => {
              setItemId(e.target.value);
              setSize("");
              setQty(1);
            }}
          >
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name} · talle {i.size}
              </option>
            ))}
          </select>
        )}
        <select className="input" aria-label="Talle nuevo" value={size} onChange={(e) => setSize(e.target.value)}>
          <option value="">{sizes.length ? `Del ${item?.size} al…` : "No viene en otros talles"}</option>
          {sizes.map((s) => (
            <option key={s.size} value={s.size} disabled={s.stock === 0}>
              Talle {s.size} · {s.stock ? `quedan ${s.stock}` : "agotado"}
            </option>
          ))}
        </select>
        {item && item.qty > 1 && (
          <select className="input" aria-label="Cuántas" value={qty} onChange={(e) => setQty(Number(e.target.value))}>
            {Array.from({ length: item.qty }, (_, n) => n + 1).map((n) => (
              <option key={n} value={n}>
                {n} de {item.qty}
              </option>
            ))}
          </select>
        )}
      </div>
      <label className="od-refund-check">
        <input type="checkbox" checked={restock} onChange={(e) => setRestock(e.target.checked)} />
        <span>
          {item ? `El talle ${item.size} vuelve al stock` : "La prenda devuelta vuelve al stock"}
          {!exchange.restockSuggested && <small className="muted">Tildalo si ya la tenés de vuelta en el taller</small>}
        </span>
      </label>
      <input
        className="input"
        aria-label="Motivo del cambio"
        placeholder="Motivo (queda en el historial)"
        maxLength={300}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      <span className="muted">
        Mismo modelo y precio: no se cobra ni se devuelve plata. Le avisamos al cliente por mail.
      </span>
      {error && (
        <p className="od-refund-error" role="alert">
          No se cambió el talle: {error}
        </p>
      )}
      <div className="od-refund-actions">
        <button
          type="button"
          className="btn btn-sm"
          disabled={busy || !size || available < qty}
          onClick={() => onConfirm({ itemId, size, qty, restock, reason })}
        >
          {busy ? "Cambiando…" : size ? `Cambiar al talle ${size}` : "Cambiar talle"}
        </button>
        <button type="button" className="btn btn-sm btn-ghost" disabled={busy} onClick={() => setOpen(false)}>
          Cancelar
        </button>
      </div>
    </section>
  );
}

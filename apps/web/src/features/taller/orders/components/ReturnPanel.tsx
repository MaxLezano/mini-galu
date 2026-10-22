"use client";

import {
  type AdminOrderItem,
  type AdminReturn,
  formatARS,
  type ReturnInput,
  returnAmounts,
} from "@mini-galu/contracts";
import { PackageMinus } from "lucide-react";
import { useState } from "react";

type Props = {
  plan: AdminReturn;
  items: AdminOrderItem[];
  busy: boolean;
  /** Por qué no salió el último intento (queda a la vista: es plata que no volvió). */
  error?: string | null;
  onConfirm: (input: ReturnInput) => void;
};

/**
 * Devolución de algunas prendas del pedido (sin mockup: lenguaje del reintegro del detalle). Primero un botón; al
 * tocarlo, cuántas de cada prenda devuelve, cuánto vuelve y por dónde, el stock y el motivo.
 */
export function ReturnPanel({ plan, items, busy, error, onConfirm }: Props) {
  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [restock, setRestock] = useState(plan.restockSuggested);
  const [reason, setReason] = useState("");
  const left = items.filter((i) => i.qty > i.returnedQty);
  const picks = left.flatMap((i) => (qty[i.id] ? [{ itemId: i.id, qty: qty[i.id] ?? 0 }] : []));
  const cents = left.reduce((a, i) => a + i.unitPriceCents * (qty[i.id] ?? 0), 0);
  const back = returnAmounts(plan, cents);

  if (!open)
    return (
      <div className="od-refund-cta">
        <button type="button" className="btn btn-sm btn-ghost" disabled={!!plan.blocked} onClick={() => setOpen(true)}>
          <PackageMinus className="i-sm" /> Devolver algunas prendas
        </button>
        {plan.blocked && <span className="muted">{plan.blocked}</span>}
      </div>
    );

  return (
    <section className="od-refund" aria-label="Devolver algunas prendas">
      <b>
        <PackageMinus className="i-sm" /> Devolver algunas prendas
      </b>
      {left.map((i) => {
        const max = i.qty - i.returnedQty;
        return (
          <div className="od-return-row" key={i.id}>
            <span>
              {i.name} · talle {i.size}
              <small className="muted"> · {formatARS(i.unitPriceCents)}</small>
            </span>
            <select
              className="input"
              aria-label={`Cuántas ${i.name} talle ${i.size} devuelve`}
              value={qty[i.id] ?? 0}
              onChange={(e) => setQty((q) => ({ ...q, [i.id]: Number(e.target.value) }))}
            >
              {Array.from({ length: max + 1 }, (_, n) => n).map((n) => (
                <option key={n} value={n}>
                  {n === 0 ? "No la devuelve" : max > 1 ? `${n} de ${max}` : "La devuelve"}
                </option>
              ))}
            </select>
          </div>
        );
      })}
      {back.saleCents > 0 && (
        <ul>
          {back.cents > 0 &&
            (plan.cash ? (
              <li>
                Le devolvés <b>{formatARS(back.cents)}</b> en efectivo: lo cobraste en el taller.
              </li>
            ) : (
              <li>
                Vuelven <b>{formatARS(back.cents)}</b> por Mercado Pago, al mismo medio con el que pagó.
              </li>
            ))}
          {back.giftcardCents > 0 && (
            <li>
              Vuelven <b>{formatARS(back.giftcardCents)}</b> al saldo de la gift card que usó.
            </li>
          )}
          {back.discountCents > 0 && (
            <li className="muted">Sin {formatARS(back.discountCents)} del descuento del cupón que les tocó.</li>
          )}
        </ul>
      )}
      <label className="od-refund-check">
        <input type="checkbox" checked={restock} onChange={(e) => setRestock(e.target.checked)} />
        <span>
          Las prendas devueltas vuelven al stock
          {!plan.restockSuggested && <small className="muted">Tildalo si ya las tenés de vuelta en el taller</small>}
        </span>
      </label>
      <input
        className="input"
        aria-label="Motivo de la devolución"
        placeholder="Motivo (queda en el historial)"
        maxLength={300}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      <span className="muted">
        El envío no se devuelve y el resto del pedido sigue igual. Sale una nota de crédito por lo devuelto y le
        avisamos al cliente por mail. No se puede deshacer.
      </span>
      {error && (
        <p className="od-refund-error" role="alert">
          No se hizo la devolución: {error}
        </p>
      )}
      <div className="od-refund-actions">
        <button
          type="button"
          className="btn btn-sm"
          disabled={busy || !picks.length || back.saleCents <= 0}
          onClick={() => onConfirm({ items: picks, restock, reason })}
        >
          {busy ? "Devolviendo…" : picks.length ? `Devolver ${formatARS(back.saleCents)}` : "Devolver"}
        </button>
        <button type="button" className="btn btn-sm btn-ghost" disabled={busy} onClick={() => setOpen(false)}>
          Cancelar
        </button>
      </div>
    </section>
  );
}

"use client";

import { type AdminRefund, formatARS } from "@mini-galu/contracts";
import { Undo2 } from "lucide-react";
import { useState } from "react";

type Props = {
  refund: AdminRefund;
  busy: boolean;
  onConfirm: (input: { restock: boolean; reason: string }) => void;
};

/**
 * Reintegro total del pedido, dentro del apartado de pago del detalle (sin mockup: lenguaje del detalle y del aviso
 * de arrepentimiento). Primero un botón; al tocarlo, qué vuelve y por dónde, el stock y el motivo, y la confirmación.
 */
export function RefundPanel({ refund, busy, onConfirm }: Props) {
  const [open, setOpen] = useState(false);
  const [restock, setRestock] = useState(refund.restockSuggested);
  const [reason, setReason] = useState("");
  const total = refund.cents + refund.giftcardCents;

  if (!open)
    return (
      <div className="od-refund-cta">
        <button
          type="button"
          className="btn btn-sm btn-ghost"
          disabled={!!refund.blocked}
          onClick={() => setOpen(true)}
        >
          <Undo2 className="i-sm" /> Reintegrar el pago
        </button>
        {refund.blocked && <span className="muted">{refund.blocked}</span>}
      </div>
    );

  return (
    <section className="od-refund" aria-label="Reintegrar el pago">
      <b>
        <Undo2 className="i-sm" /> Reintegrar el pedido
      </b>
      <ul>
        {refund.cents > 0 &&
          (refund.cash ? (
            <li>
              Le devolvés <b>{formatARS(refund.cents)}</b> en efectivo: lo cobraste en el taller.
            </li>
          ) : (
            <li>
              Vuelven <b>{formatARS(refund.cents)}</b> por Mercado Pago, al mismo medio con el que pagó.
            </li>
          ))}
        {refund.giftcardCents > 0 && (
          <li>
            Vuelven <b>{formatARS(refund.giftcardCents)}</b> al saldo de la gift card que usó.
          </li>
        )}
      </ul>
      {refund.restock && (
        <label className="od-refund-check">
          <input type="checkbox" checked={restock} onChange={(e) => setRestock(e.target.checked)} />
          <span>
            Las prendas vuelven al stock
            {!refund.restockSuggested && (
              <small className="muted">Tildalo si ya las tenés de vuelta en el taller</small>
            )}
          </span>
        </label>
      )}
      <input
        className="input"
        aria-label="Motivo del reintegro"
        placeholder="Motivo (queda en el historial)"
        maxLength={300}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      <span className="muted">Le avisamos al cliente por mail. Un reintegro no se puede deshacer.</span>
      <div className="od-refund-actions">
        <button type="button" className="btn btn-sm" disabled={busy} onClick={() => onConfirm({ restock, reason })}>
          {busy ? "Reintegrando…" : `Reintegrar ${formatARS(total)}`}
        </button>
        <button type="button" className="btn btn-sm btn-ghost" disabled={busy} onClick={() => setOpen(false)}>
          Cancelar
        </button>
      </div>
    </section>
  );
}

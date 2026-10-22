"use client";

import { Ban } from "lucide-react";
import { useState } from "react";

type Props = {
  /** Es un link de pago (deja de cobrar) o un checkout de la web. */
  isLink: boolean;
  /** Mercado Pago está revisando un pago de este pedido. */
  inReview: boolean;
  busy: boolean;
  /** Por qué no salió el último intento (queda a la vista). */
  error?: string | null;
  onConfirm: (reason: string) => void;
};

/**
 * Anular un pedido que espera pago (sin mockup: lenguaje del reintegro del detalle). Primero un botón; al tocarlo,
 * qué pasa con las prendas y el link, el motivo y la confirmación.
 */
export function CancelPanel({ isLink, inReview, busy, error, onConfirm }: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  if (!open)
    return (
      <div className="od-refund-cta">
        <button type="button" className="btn btn-sm btn-ghost" onClick={() => setOpen(true)}>
          <Ban className="i-sm" /> Anular pedido
        </button>
      </div>
    );

  return (
    <section className="od-refund" aria-label="Anular el pedido">
      <b>
        <Ban className="i-sm" /> Anular el pedido
      </b>
      <ul>
        <li>Las prendas vuelven a la tienda ya mismo.</li>
        {isLink && <li>El link de pago deja de andar: si lo abre, ve que se canceló.</li>}
        {inReview && (
          <li>
            Mercado Pago está revisando un pago: si igual se aprueba, el pedido vuelve (o te avisamos para reintegrar si
            las prendas ya no están).
          </li>
        )}
      </ul>
      <input
        className="input"
        aria-label="Motivo de la anulación"
        placeholder="Motivo (queda en el historial)"
        maxLength={300}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      {error && (
        <p className="od-refund-error" role="alert">
          No se anuló: {error}
        </p>
      )}
      <div className="od-refund-actions">
        <button type="button" className="btn btn-sm" disabled={busy} onClick={() => onConfirm(reason)}>
          Anular pedido
        </button>
        <button type="button" className="btn btn-sm btn-ghost" disabled={busy} onClick={() => setOpen(false)}>
          Volver
        </button>
      </div>
    </section>
  );
}

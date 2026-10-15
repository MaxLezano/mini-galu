"use client";

import { REVOCATION_DAYS, type RevocationReceipt } from "@mini-galu/contracts";
import { useState } from "react";
import { normalizeCode } from "@/features/tracking/tracking-view";
import { ApiRequestError, api } from "@/lib/api";
import { longDateYear } from "@/lib/date";
import { RevocationDone } from "../components/RevocationDone";
import "../revocation.css";

/** Botón de arrepentimiento (Res. SCI 424/2020): número de pedido + mail de la compra → código de solicitud. */
export function RevocationView({ order }: { order: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<RevocationReceipt | null>(null);

  return (
    <main className="wrap rv">
      <header className="rv-hero">
        <span className="eyebrow is-in">Tus derechos</span>
        <h1 className="display h2">
          Botón de <em>arrepentimiento</em>
        </h1>
        <p className="lead">
          Si compraste en la tienda, tenés {REVOCATION_DAYS} días corridos desde que recibís el pedido para
          arrepentirte, sin explicar por qué y sin costo (Ley 24.240, art. 34). No hace falta cuenta.
        </p>
      </header>

      <section className="rv-card">
        {done ? (
          <RevocationDone r={done} when={longDateYear(done.requestedAt)} />
        ) : (
          <form
            className="rv-form"
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              setBusy(true);
              setError(null);
              try {
                setDone(
                  await api.revoke({
                    order: normalizeCode(String(f.get("order") ?? "")),
                    email: String(f.get("email") ?? ""),
                    reason: String(f.get("reason") ?? ""),
                  }),
                );
              } catch (err) {
                setError(
                  err instanceof ApiRequestError
                    ? err.code === "validation_error"
                      ? "Revisá el número de pedido y el mail"
                      : err.message
                    : "No pudimos registrarlo. Probá de nuevo o escribinos.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <div className="field">
              <label htmlFor="rv-order">Número de pedido</label>
              <input
                id="rv-order"
                name="order"
                className="input"
                required
                defaultValue={order}
                placeholder="MG-1042"
                autoComplete="off"
              />
            </div>
            <div className="field">
              <label htmlFor="rv-email">Mail con el que compraste</label>
              <input
                id="rv-email"
                name="email"
                type="email"
                className="input"
                required
                placeholder="tu@email.com"
                autoComplete="email"
              />
            </div>
            <div className="field rv-wide">
              <label htmlFor="rv-reason">
                Motivo <span className="muted">(opcional)</span>
              </label>
              <textarea id="rv-reason" name="reason" className="input" maxLength={1000} rows={3} />
            </div>
            {error && (
              <p className="rv-error rv-wide" role="alert">
                {error}
              </p>
            )}
            <div className="rv-wide rv-submit">
              <button type="submit" className="btn" disabled={busy}>
                {busy ? "Enviando…" : "Pedir la baja"}
              </button>
              <p className="muted">
                Te damos un código de solicitud al instante y te lo mandamos por mail. El número de pedido está en el
                mail de la compra.
              </p>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}

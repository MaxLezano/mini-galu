"use client";

import { formatARS, type GiftcardBalance } from "@mini-galu/contracts";
import { type FormEvent, useState } from "react";
import { ApiRequestError, api } from "@/lib/api";
import { longDateYear } from "@/lib/date";
import { Bow } from "@/ui/atoms/Bow";

type Result = { ok: true; card: GiftcardBalance } | { ok: false; message: string } | null;

/** "Consultá tu saldo" (giftcards.html → .bal). */
export function BalanceCheck() {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Result>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    try {
      setRes({ ok: true, card: await api.giftcardBalance(code.trim()) });
    } catch (err) {
      setRes({
        ok: false,
        message:
          err instanceof ApiRequestError && err.status === 404
            ? "No encontramos ese código."
            : "No pudimos consultar el saldo. Probá de nuevo.",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bal">
      <span className="big-bow">
        <Bow />
      </span>
      <span className="eyebrow" style={{ color: "var(--rosa)" }}>
        Ya tengo una
      </span>
      <h2 className="display h3">
        Consultá tu <em>saldo</em>
      </h2>
      <form onSubmit={submit}>
        <input
          className="input"
          placeholder="Código (ej. GALU-7KQ2-M9XA)"
          aria-label="Código de la gift card"
          required
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <button type="submit" className="btn btn-light" disabled={busy}>
          Consultar
        </button>
      </form>
      <div aria-live="polite">
        {res?.ok && (
          <div className="bal-res">
            <span>
              Saldo de <b style={{ font: "inherit", color: "inherit" }}>{res.card.code}</b> · para {res.card.toName}
            </span>
            <b>{formatARS(res.card.balanceCents)}</b>
            <span style={{ opacity: 0.75 }}>
              {res.card.usable
                ? `Vence el ${longDateYear(res.card.expiresAt)}. Cargala en el checkout, en "Gift card".`
                : res.card.balanceCents > 0
                  ? `Venció el ${longDateYear(res.card.expiresAt)}.`
                  : "Ya se usó todo el saldo."}
            </span>
          </div>
        )}
        {res && !res.ok && (
          <div className="bal-res">
            <span>{res.message}</span>
            <span style={{ opacity: 0.75 }}>Revisá que empiece con GALU- o escribinos por WhatsApp.</span>
          </div>
        )}
      </div>
    </div>
  );
}

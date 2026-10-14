"use client";

import Link from "next/link";
import { useState } from "react";
import { ApiRequestError, api } from "@/lib/api";
import { Embroidery } from "@/ui/atoms/Embroidery";

/** Baja de las Cartas del taller desde el link de la carta (se confirma con un clic: los lectores de mail abren links). */
export function Unsubscribe({ token }: { token: string | null }) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    if (!token) return;
    setState("busy");
    try {
      await api.unsubscribe(token);
      setState("done");
    } catch (e) {
      setError(
        e instanceof ApiRequestError && e.status === 404
          ? "Ese link de baja no existe o ya no sirve."
          : "No pudimos darte de baja. Probá de nuevo.",
      );
      setState("error");
    }
  };

  return (
    <main className="wrap">
      <div className="empty-state" style={{ padding: "80px 0 120px", maxWidth: 520, margin: "0 auto" }}>
        <Embroidery />
        {state === "done" ? (
          <>
            <div className="hand" style={{ fontSize: 34 }}>
              Listo, no te escribimos más
            </div>
            <p className="muted" style={{ margin: 0 }}>
              Si cambiás de idea, te podés volver a sumar desde el pie de la tienda.
            </p>
            <Link className="btn" href="/">
              Volver a la tienda
            </Link>
          </>
        ) : (
          <>
            <div className="hand" style={{ fontSize: 34 }}>
              ¿Dejar de recibir las cartas?
            </div>
            <p className="muted" style={{ margin: 0 }}>
              Una carta por mes con los lanzamientos y lo que pasa en el taller. Nos da pena, pero lo entendemos.
            </p>
            {token ? (
              <button type="button" className="btn" disabled={state === "busy"} onClick={confirm}>
                {state === "busy" ? "Un segundo…" : "Sí, darme de baja"}
              </button>
            ) : (
              <p className="field-error">Falta el link de baja: usá el que viene al pie de la carta.</p>
            )}
            {error && (
              <p className="field-error" role="alert">
                {error}
              </p>
            )}
          </>
        )}
      </div>
    </main>
  );
}

"use client";

import { PasswordSchema } from "@mini-galu/contracts";
import Link from "next/link";
import { useState } from "react";
import { accountApi } from "@/lib/account-api";
import { ApiRequestError } from "@/lib/api";
import { PasswordInput } from "./components/PasswordInput";
import "./auth.css";

/** Contraseña nueva desde el link del mail ("¿Te olvidaste la contraseña?"). */
export function NewPasswordView({ token, invalid }: { token: string | null; invalid: boolean }) {
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(invalid ? "El link venció o ya se usó: pedí uno nuevo." : null);

  return (
    <main className="auth">
      <div className="auth-media" style={{ background: "var(--cacao)" }} />
      <div className="auth-box">
        <div className="auth-card">
          <div>
            <span className="eyebrow is-in">Tu cuenta</span>
            <h1 className="display h2">
              Contraseña <em>nueva</em>
            </h1>
          </div>
          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}
          {done ? (
            <>
              <p className="auth-ok" role="status">
                Listo: ya podés ingresar con tu contraseña nueva.
              </p>
              <Link className="btn btn-lg btn-block" href="/ingresar">
                Ingresar
              </Link>
            </>
          ) : token && !invalid ? (
            <form
              className="auth-form"
              onSubmit={async (e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const pass = String(fd.get("password"));
                const r = PasswordSchema.safeParse(pass);
                if (!r.success) return setError(r.error.issues[0]?.message ?? "Revisá la contraseña");
                if (pass !== fd.get("confirm")) return setError("Las dos contraseñas no coinciden");
                setBusy(true);
                setError(null);
                try {
                  await accountApi.resetPassword(token, pass);
                  setDone(true);
                } catch (err) {
                  setError(
                    err instanceof ApiRequestError && err.status === 400
                      ? "El link venció o ya se usó: pedí uno nuevo desde Ingresar"
                      : "No pudimos guardar la contraseña, probá de nuevo",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              <div className="field">
                <label htmlFor="np-pass">Contraseña nueva</label>
                <PasswordInput id="np-pass" name="password" autoComplete="new-password" rules />
              </div>
              <div className="field">
                <label htmlFor="np-confirm">Repetila</label>
                <input
                  className="input"
                  id="np-confirm"
                  name="confirm"
                  type="password"
                  autoComplete="new-password"
                  required
                />
              </div>
              <button type="submit" className="btn btn-lg btn-block" disabled={busy}>
                {busy ? "Guardando…" : "Guardar contraseña"}
              </button>
            </form>
          ) : (
            <Link className="btn btn-lg btn-block" href="/ingresar">
              Volver a ingresar
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}

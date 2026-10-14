"use client";

import { Check, Copy, Download, ShieldCheck, ShieldOff } from "lucide-react";
import QRCode from "qrcode";
import { useState } from "react";
import { toast } from "@/features/shell/ui-store";
import { adminApi } from "@/lib/admin-api";
import { ApiRequestError } from "@/lib/api";

type Setup = { uri: string; secret: string; qr: string; codes: string[] };

/**
 * Verificación en dos pasos del panel (TOTP con app autenticadora + códigos de respaldo). Obligatoria en producción:
 * sin activarla, la API no deja usar el panel.
 */
export function SecuritySettings({ enabled: initial, email }: { enabled: boolean; email: string }) {
  const [enabled, setEnabled] = useState(initial);
  const [setup, setSetup] = useState<Setup | null>(null);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : "No se pudo completar, probá de nuevo");
    } finally {
      setBusy(false);
    }
  };

  const start = (password: string) =>
    run(async () => {
      const r = await adminApi.enableTwoFactor(password);
      const secret = new URL(r.totpURI).searchParams.get("secret") ?? "";
      setSetup({
        uri: r.totpURI,
        secret,
        codes: r.backupCodes,
        qr: await QRCode.toDataURL(r.totpURI, { margin: 1, width: 220 }),
      });
    });

  const confirm = (code: string) =>
    run(async () => {
      try {
        await adminApi.confirmTwoFactor(code);
      } catch {
        throw new ApiRequestError(400, "bad_code", "Ese código no coincide: fijate que sea el de ahora en la app");
      }
      setCodes(setup?.codes ?? []);
      setSetup(null);
      setEnabled(true);
      toast("Verificación en dos pasos activada", { icon: <ShieldCheck className="i-sm" /> });
    });

  const disable = (password: string) =>
    run(async () => {
      await adminApi.disableTwoFactor(password);
      setEnabled(false);
      setCodes(null);
      toast("Verificación en dos pasos desactivada", { icon: <ShieldOff className="i-sm" /> });
    });

  const codesText = codes?.join("\n") ?? "";

  return (
    <main className="adm-content">
      <div className="adm-head">
        <div>
          <span className="eyebrow is-in">Ajustes</span>
          <h1 className="display">Seguridad</h1>
          <p className="muted" style={{ margin: "10px 0 0", maxWidth: "60ch" }}>
            Además de la contraseña, el panel pide un código de una app autenticadora del celular. Si alguien consigue
            tu contraseña, igual no puede entrar.
          </p>
        </div>
      </div>

      <section className="box" style={{ maxWidth: 720 }} id="dos-pasos">
        <div className="box-head">
          <h2>Verificación en dos pasos</h2>
          <span className={`pill-status ${enabled ? "st-ok" : "st-warn"}`}>{enabled ? "Activada" : "Desactivada"}</span>
        </div>

        {error && (
          <p className="field-error" role="alert" style={{ marginTop: 0 }}>
            {error}
          </p>
        )}

        {codes && (
          <div style={{ display: "grid", gap: 12, marginBottom: 16 }}>
            <p style={{ margin: 0 }}>
              <b>Guardá estos códigos de respaldo</b> en un lugar seguro: sirven para entrar si perdés el celular. Cada
              uno se usa una sola vez y no se vuelven a mostrar.
            </p>
            <pre className="codes" data-codes>
              {codesText}
            </pre>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => navigator.clipboard?.writeText(codesText).then(() => toast("Códigos copiados"))}
              >
                <Copy className="i-sm" /> Copiar
              </button>
              <a
                className="btn btn-sm btn-ghost"
                download="mini-galu-codigos-de-respaldo.txt"
                href={`data:text/plain;charset=utf-8,${encodeURIComponent(`Mini Galú · ${email}\n\n${codesText}\n`)}`}
              >
                <Download className="i-sm" /> Descargar
              </a>
            </div>
          </div>
        )}

        {setup ? (
          <form
            style={{ display: "grid", gap: 14 }}
            onSubmit={(e) => {
              e.preventDefault();
              confirm(String(new FormData(e.currentTarget).get("code")));
            }}
          >
            <p style={{ margin: 0 }}>
              1. Escaneá el código con la app autenticadora (Google Authenticator, Microsoft Authenticator, 1Password…).
            </p>
            <img src={setup.qr} alt="Código QR para la app autenticadora" width={220} height={220} />
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>
              ¿No podés escanear? Cargá esta clave a mano: <code className="secret">{setup.secret}</code>
            </p>
            <div className="field">
              <label htmlFor="sec-code">2. Escribí el código de 6 números que muestra la app</label>
              <input
                className="input"
                id="sec-code"
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                style={{ maxWidth: 200 }}
              />
            </div>
            <button type="submit" className="btn" disabled={busy} style={{ justifySelf: "start" }}>
              <Check className="i-sm" /> {busy ? "Verificando…" : "Confirmar y activar"}
            </button>
          </form>
        ) : (
          <form
            style={{ display: "grid", gap: 14 }}
            onSubmit={(e) => {
              e.preventDefault();
              const password = String(new FormData(e.currentTarget).get("password"));
              if (enabled) disable(password);
              else start(password);
              e.currentTarget.reset();
            }}
          >
            {!enabled && (
              <p style={{ margin: 0 }}>
                Para usar el panel en la web publicada, la verificación en dos pasos tiene que estar activada.
              </p>
            )}
            <div className="field">
              <label htmlFor="sec-pass">Tu contraseña</label>
              <input
                className="input"
                id="sec-pass"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                style={{ maxWidth: 320 }}
              />
            </div>
            <button
              type="submit"
              className={`btn ${enabled ? "btn-ghost" : ""}`}
              disabled={busy}
              style={{ justifySelf: "start" }}
            >
              {enabled ? <ShieldOff className="i-sm" /> : <ShieldCheck className="i-sm" />}{" "}
              {busy ? "Un segundo…" : enabled ? "Desactivar" : "Activar la verificación en dos pasos"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}

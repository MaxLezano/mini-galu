"use client";

import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { adminApi } from "@/lib/admin-api";
import { ApiRequestError } from "@/lib/api";
import { Foco } from "@/ui/atoms/Foco";
import "./login.css";

/** Ingreso al panel del taller (email + contraseña). */
export function AdminLogin() {
  const params = useSearchParams();
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  /** Con verificación en dos pasos, después de la contraseña se pide el código de la app. */
  const [step, setStep] = useState<"password" | "code">("password");
  const [backup, setBackup] = useState(false);
  const back = params.get("volver");
  const target = back?.startsWith("/taller") ? back : "/taller";

  return (
    <main className="auth">
      <div className="auth-media is-brand">
        <span className="big-bow">
          <Foco />
        </span>
        <div className="quote">
          <p>Lo que cargues acá aparece al instante en la tienda y en Galú.</p>
          <span className="hand">— el taller</span>
        </div>
      </div>
      <div className="auth-box">
        <div className="auth-card">
          <div>
            <span className="eyebrow is-in">Panel del taller</span>
            <h1 className="display h2">
              Hola, <em>Gaby</em>
            </h1>
          </div>
          {step === "code" ? (
            <form
              className="auth-form"
              onSubmit={async (e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                setBusy(true);
                setError(null);
                try {
                  await adminApi.verifySecondStep(String(fd.get("code")), backup, fd.get("trust") === "on");
                  window.location.assign(target);
                } catch (err) {
                  setError(
                    err instanceof ApiRequestError && err.status === 429
                      ? "Demasiados intentos: esperá un minuto y probá de nuevo"
                      : "Ese código no sirve. Fijate que sea el de ahora en la app (cambia cada 30 segundos)",
                  );
                  setBusy(false);
                }
              }}
            >
              {error && (
                <p className="auth-error" role="alert">
                  {error}
                </p>
              )}
              <p className="muted" style={{ margin: 0 }}>
                {backup
                  ? "Escribí uno de los códigos de respaldo que guardaste al activar la verificación."
                  : "Abrí tu app autenticadora (Google Authenticator, 1Password…) y escribí el código de 6 números."}
              </p>
              <div className="field">
                <label htmlFor="a-code">{backup ? "Código de respaldo" : "Código de verificación"}</label>
                <input
                  className="input"
                  id="a-code"
                  name="code"
                  inputMode={backup ? "text" : "numeric"}
                  autoComplete="one-time-code"
                  required
                />
              </div>
              <label className="check">
                <input type="checkbox" name="trust" /> Recordar este dispositivo 30 días
              </label>
              <button type="submit" className="btn btn-lg btn-block" disabled={busy}>
                {busy ? "Verificando…" : "Verificar y entrar"}
              </button>
              <button
                type="button"
                className="link"
                onClick={() => setBackup(!backup)}
                style={{ justifySelf: "center" }}
              >
                {backup ? "Usar el código de la app" : "Usar un código de respaldo"}
              </button>
            </form>
          ) : (
            <form
              className="auth-form"
              onSubmit={async (e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                setBusy(true);
                setError(null);
                try {
                  const r = await adminApi.signIn(String(fd.get("email")), String(fd.get("password")));
                  if (r?.twoFactorRedirect) {
                    setStep("code");
                    setBusy(false);
                    return;
                  }
                  // navegación completa: el panel arranca con la cookie de sesión ya puesta (dos navegaciones del
                  // router en paralelo se pisaban con la redirección de /taller y el render quedaba colgado)
                  window.location.assign(target);
                } catch (err) {
                  setError(
                    err instanceof ApiRequestError && err.status === 401
                      ? "El email o la contraseña no coinciden"
                      : err instanceof ApiRequestError && err.status === 429
                        ? err.message
                        : "No pudimos conectar con el taller, probá de nuevo",
                  );
                  setBusy(false);
                }
              }}
            >
              {error && (
                <p className="auth-error" role="alert">
                  {error}
                </p>
              )}
              <div className="field">
                <label htmlFor="a-mail">Email</label>
                <input
                  className="input"
                  id="a-mail"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="tu@email.com"
                />
              </div>
              <div className="field">
                <label htmlFor="a-pass">Contraseña</label>
                <div className="pass">
                  <input
                    className="input"
                    id="a-pass"
                    name="password"
                    type={show ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    minLength={8}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
                    onClick={() => setShow(!show)}
                  >
                    {show ? <EyeOff className="i-sm" /> : <Eye className="i-sm" />}
                  </button>
                </div>
              </div>
              <button type="submit" className="btn btn-lg btn-block" disabled={busy}>
                {busy ? "Entrando…" : "Entrar al taller"}
              </button>
            </form>
          )}
          <p className="legal">
            ¿Buscabas la tienda?{" "}
            <Link className="link" href="/">
              Ir a Mini Galú
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

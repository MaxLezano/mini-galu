"use client";

import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { adminApi } from "@/lib/admin-api";
import { ApiRequestError } from "@/lib/api";
import { Bow } from "@/ui/atoms/Bow";
import "./login.css";

/** Ingreso al panel del taller (email + contraseña). */
export function AdminLogin() {
  const params = useSearchParams();
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const back = params.get("volver");
  const target = back?.startsWith("/taller") ? back : "/taller/productos";

  return (
    <main className="auth">
      <div className="auth-media is-brand">
        <span className="big-bow">
          <Bow />
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
          <form
            className="auth-form"
            onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              setBusy(true);
              setError(null);
              try {
                await adminApi.signIn(String(fd.get("email")), String(fd.get("password")));
                // navegación completa: el panel arranca con la cookie de sesión ya puesta (dos navegaciones del
                // router en paralelo se pisaban con la redirección de /taller y el render quedaba colgado)
                window.location.assign(target);
              } catch (err) {
                setError(
                  err instanceof ApiRequestError && err.status === 401
                    ? "El email o la contraseña no coinciden"
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

"use client";

import { SignUpInputSchema } from "@mini-galu/contracts";
import { Baby, BellRing, Package } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "@/features/shell/ui-store";
import { accountApi } from "@/lib/account-api";
import { ApiRequestError } from "@/lib/api";
import { BrandIcon } from "@/ui/atoms/BrandIcon";
import { useAccount } from "./account-store";
import { PasswordInput } from "./components/PasswordInput";
import "./auth.css";
import { Picture } from "@/ui/atoms/Picture";

type Tab = "ingresar" | "crear";

/** Ingresar o crear cuenta — design/mockups/ingresar.html */
export function AuthView({ photo }: { photo: { url: string; alt: string } | null }) {
  const params = useSearchParams();
  const router = useRouter();
  const load = useAccount((s) => s.load);
  const status = useAccount((s) => s.status);
  const [tab, setTab] = useState<Tab>(params.get("crear") !== null ? "crear" : "ingresar");
  const [google, setGoogle] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const back = params.get("volver");
  const target = back?.startsWith("/") && !back.startsWith("//") ? back : "/cuenta";

  useEffect(() => {
    accountApi.options().then(
      (o) => setGoogle(o.google),
      () => setGoogle(false),
    );
  }, []);
  // ya con sesión: directo a la cuenta
  useEffect(() => {
    if (status === "in") router.replace(target);
  }, [status, router, target]);

  const show = (t: Tab) => {
    setTab(t);
    setError(null);
    setOk(null);
  };

  const done = async (msg: string) => {
    await load();
    toast(msg);
    router.push(target);
  };

  const signIn = async (fd: FormData) => {
    setBusy(true);
    setError(null);
    try {
      const r = await accountApi.signIn(
        String(fd.get("email")),
        String(fd.get("password")),
        fd.get("remember") === "on",
      );
      if (r.twoFactorRedirect) {
        // la cuenta del taller entra por su propio ingreso (con el código de la app)
        window.location.assign("/taller/ingresar");
        return;
      }
      await done(`¡Hola de nuevo${r.user?.firstName ? `, ${r.user.firstName}` : ""}!`);
    } catch (e) {
      setError(
        e instanceof ApiRequestError && e.status === 401
          ? "El email o la contraseña no coinciden"
          : e instanceof ApiRequestError && e.status === 429
            ? e.message
            : "No pudimos conectar, probá de nuevo",
      );
    } finally {
      setBusy(false);
    }
  };

  const signUp = async (fd: FormData) => {
    const r = SignUpInputSchema.safeParse({
      firstName: fd.get("firstName"),
      lastName: fd.get("lastName"),
      email: fd.get("email"),
      password: fd.get("password"),
      newsletter: fd.get("newsletter") === "on",
    });
    if (!r.success) return setError(r.error.issues[0]?.message ?? "Revisá los datos");
    setBusy(true);
    setError(null);
    try {
      await accountApi.signUp(r.data, `${location.origin}/cuenta?verificado`);
      await done(`¡Bienvenida, ${r.data.firstName}! Ya podés sumar a tus nenas`);
    } catch (e) {
      setError(
        e instanceof ApiRequestError && e.status === 422
          ? "Ya hay una cuenta con ese mail: ingresá o recuperá la contraseña"
          : e instanceof ApiRequestError
            ? e.message
            : "No pudimos crear la cuenta, probá de nuevo",
      );
    } finally {
      setBusy(false);
    }
  };

  const forgot = async () => {
    const email = (document.getElementById("li-mail") as HTMLInputElement | null)?.value.trim() ?? "";
    if (!email) return setError("Escribí tu mail y te mandamos un link para recuperarla");
    setError(null);
    await accountApi.requestReset(email, `${location.origin}/ingresar/nueva-clave`).catch(() => {});
    // misma respuesta exista o no la cuenta
    setOk(`Si hay una cuenta con ${email}, te llega un link para crear una contraseña nueva`);
  };

  const withGoogle = async () => {
    try {
      const r = await accountApi.google(`${location.origin}${target}`);
      location.assign(r.url);
    } catch {
      setError("No pudimos conectar con Google, probá de nuevo");
    }
  };

  return (
    <main className="auth">
      <div className="auth-media">
        {photo && <Picture src={photo.url} alt={photo.alt} sizes="(max-width: 900px) 100vw, 50vw" />}
        <div className="quote">
          <p>Guardamos el talle de tus nenas para mostrarte lo que les queda.</p>
          <span className="hand">— Gaby, desde el taller</span>
        </div>
      </div>

      <div className="auth-box">
        <div className="auth-card">
          <div>
            <span className="eyebrow is-in">Tu cuenta</span>
            <h1 className="display h2">
              {tab === "crear" ? (
                <>
                  Creá tu <em>cuenta</em>
                </>
              ) : (
                <>
                  Hola de <em>nuevo</em>
                </>
              )}
            </h1>
          </div>

          <div className="auth-tabs" role="tablist" data-tab={tab}>
            <i className="knob" />
            {(["ingresar", "crear"] as const).map((t) => (
              <button type="button" role="tab" key={t} aria-selected={tab === t} onClick={() => show(t)}>
                {t === "ingresar" ? "Ingresar" : "Crear cuenta"}
              </button>
            ))}
          </div>

          {google && (
            <>
              <button className="google" type="button" onClick={withGoogle}>
                <BrandIcon name="google" /> Continuar con Google
              </button>
              <div className="or">o con tu mail</div>
            </>
          )}

          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}
          {ok && (
            <p className="auth-ok" role="status">
              {ok}
            </p>
          )}

          {tab === "ingresar" ? (
            <form
              className="auth-form"
              onSubmit={(e) => {
                e.preventDefault();
                signIn(new FormData(e.currentTarget));
              }}
            >
              <div className="field">
                <label htmlFor="li-mail">Email</label>
                <input
                  className="input"
                  id="li-mail"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="tu@email.com"
                />
              </div>
              <div className="field">
                <label htmlFor="li-pass">Contraseña</label>
                <PasswordInput id="li-pass" name="password" autoComplete="current-password" />
              </div>
              <div className="row-between">
                <label className="check">
                  <input type="checkbox" name="remember" defaultChecked /> Recordarme
                </label>
                <button type="button" className="link" onClick={forgot}>
                  ¿Te olvidaste la contraseña?
                </button>
              </div>
              <button type="submit" className="btn btn-lg btn-block" disabled={busy}>
                {busy ? "Entrando…" : "Ingresar"}
              </button>
            </form>
          ) : (
            <form
              className="auth-form"
              onSubmit={(e) => {
                e.preventDefault();
                signUp(new FormData(e.currentTarget));
              }}
            >
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="field">
                  <label htmlFor="cr-first">Nombre</label>
                  <input className="input" id="cr-first" name="firstName" autoComplete="given-name" required />
                </div>
                <div className="field">
                  <label htmlFor="cr-last">Apellido</label>
                  <input className="input" id="cr-last" name="lastName" autoComplete="family-name" required />
                </div>
              </div>
              <div className="field">
                <label htmlFor="cr-mail">Email</label>
                <input
                  className="input"
                  id="cr-mail"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="tu@email.com"
                />
              </div>
              <div className="field">
                <label htmlFor="cr-pass">Contraseña</label>
                <PasswordInput
                  id="cr-pass"
                  name="password"
                  autoComplete="new-password"
                  placeholder="Mínimo 8 caracteres"
                  rules
                />
              </div>
              <label className="check">
                <input type="checkbox" name="newsletter" defaultChecked /> Quiero recibir las Cartas del taller (1 por
                mes)
              </label>
              <button type="submit" className="btn btn-lg btn-block" disabled={busy}>
                {busy ? "Creando…" : "Crear mi cuenta"}
              </button>
              <ul className="perks-mini">
                <li>
                  <Baby className="i-sm" /> Guardá el talle y el cumple de tus nenas
                </li>
                <li>
                  <BellRing className="i-sm" /> Te avisamos cuando vuelve un talle
                </li>
                <li>
                  <Package className="i-sm" /> Seguí tus pedidos en un solo lugar
                </li>
              </ul>
            </form>
          )}

          <p className="guest">
            ¿Solo querés comprar?{" "}
            <Link className="link" href="/catalogo">
              Seguí sin cuenta
            </Link>
          </p>
          <p className="legal">
            Al continuar aceptás los <Link href="/ayuda/terminos">términos</Link> y la{" "}
            <Link href="/ayuda/privacidad">política de privacidad</Link> de Mini Galú.
          </p>
        </div>
      </div>
    </main>
  );
}

"use client";

import { type ContactChannel, imageThumb, type Launch } from "@mini-galu/contracts";
import { BellRing, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "@/features/shell/ui-store";
import { ApiRequestError, api } from "@/lib/api";
import { longDate } from "@/lib/date";
import { BrandIcon } from "@/ui/atoms/BrandIcon";
import { Emphasis } from "@/ui/atoms/Emphasis";
import { Picture } from "@/ui/atoms/Picture";

function useCountdown(target: string) {
  const [parts, setParts] = useState<string[] | null>(null);
  useEffect(() => {
    const t = new Date(target).getTime();
    const tick = () => {
      const s = Math.max(0, Math.floor((t - Date.now()) / 1000));
      setParts(
        [Math.floor(s / 86400), Math.floor((s % 86400) / 3600), Math.floor((s % 3600) / 60), s % 60].map((n) =>
          String(n).padStart(2, "0"),
        ),
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);
  return parts;
}

/** Próximo lanzamiento: cuenta regresiva + "Avisame" (los anotados reciben el aviso una hora antes). */
export function LaunchDrop({ launch, avatars }: { launch: Launch; avatars: string[] }) {
  const parts = useCountdown(launch.startsAt);
  const [channel, setChannel] = useState<ContactChannel>("whatsapp");
  const [done, setDone] = useState(false);
  const [signups, setSignups] = useState(launch.signups);
  const [error, setError] = useState<string | null>(null);
  const mail = channel === "email";
  // "Otoño · Invierno 26" → la última palabra en itálica
  const title = launch.title.replace(/(\S+)$/, "*$1*");

  return (
    <section className="section wrap" id="lanzamiento">
      <div className="drop" data-reveal="">
        <div className="drop-media">
          {launch.coverUrl && (
            <Picture
              src={launch.coverUrl}
              alt={`Colección ${launch.title}`}
              loading="lazy"
              sizes="(max-width: 900px) 100vw, 50vw"
            />
          )}
          {launch.coverNote && <span className="hand">{launch.coverNote}</span>}
        </div>
        <div className="drop-body">
          <span className="eyebrow" style={{ color: "var(--rosa)" }}>
            Próximo lanzamiento · {longDate(launch.startsAt)}
          </span>
          <h2 className="display h2">
            <Emphasis text={title} />
          </h2>
          <p style={{ margin: 0, opacity: 0.8, maxWidth: "44ch" }}>{launch.teaser}</p>
          {launch.showCountdown && (
            <div className="countdown" role="timer" aria-label="Cuenta regresiva">
              {["días", "horas", "min", "seg"].map((u, i) => (
                <div key={u}>
                  <b>{parts?.[i] ?? "--"}</b>
                  <span>{u}</span>
                </div>
              ))}
            </div>
          )}
          {done ? (
            <p className="hand" style={{ fontSize: 30, color: "var(--rosa)", margin: 0 }}>
              ¡Listo! Te avisamos una hora antes.
            </p>
          ) : (
            <>
              <div className="seg-mini" role="group" aria-label="Avisarme por">
                <button type="button" aria-pressed={!mail} onClick={() => setChannel("whatsapp")}>
                  <BrandIcon name="whatsapp" /> WhatsApp
                </button>
                <button type="button" aria-pressed={mail} onClick={() => setChannel("email")}>
                  <Mail className="i-sm" /> Email
                </button>
              </div>
              <form
                className="drop-form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const contact = String(new FormData(e.currentTarget).get("contact") ?? "");
                  try {
                    const r = await api.joinLaunch(launch.id, { channel, contact });
                    setSignups(r.signups);
                    setDone(true);
                    toast("Te anotamos para el lanzamiento", { icon: <BellRing className="i-sm" /> });
                  } catch (err) {
                    setError(
                      err instanceof ApiRequestError && err.status === 422
                        ? `Revisá tu ${mail ? "email" : "WhatsApp"}`
                        : "No pudimos anotarte, probá de nuevo",
                    );
                  }
                }}
              >
                <input
                  className="input"
                  name="contact"
                  type={mail ? "email" : "text"}
                  inputMode={mail ? "email" : "tel"}
                  placeholder={mail ? "tu@email.com" : "Tu WhatsApp (ej. 11 5555-1234)"}
                  aria-label="Contacto"
                  aria-invalid={!!error}
                  onChange={() => setError(null)}
                  required
                />
                <button type="submit" className="btn btn-rose">
                  Avisame <BellRing />
                </button>
              </form>
              {error && (
                <span role="alert" style={{ fontSize: 13, color: "var(--rosa)" }}>
                  {error}
                </span>
              )}
            </>
          )}
          <div className="avatars">
            <span>
              {avatars.map((a) => (
                <img key={a} src={imageThumb(a)} alt="" />
              ))}
            </span>
            {signups} personas ya se anotaron
          </div>
        </div>
      </div>
    </section>
  );
}

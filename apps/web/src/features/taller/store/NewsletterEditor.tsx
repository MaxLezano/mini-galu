"use client";

import { type AdminNewsletter, LetterInputSchema } from "@mini-galu/contracts";
import { Download, Mail, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "@/features/shell/ui-store";
import { adminApi } from "@/lib/admin-api";
import { ApiRequestError } from "@/lib/api";
import { shortDate } from "@/lib/date";

/** Cartas del taller: suscriptos, escribir una carta, mandarse una prueba y enviarla a todos. */
export function NewsletterEditor({ initial, email }: { initial: AdminNewsletter; email: string }) {
  const [data, setData] = useState(initial);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = () => {
    const r = LetterInputSchema.safeParse({ subject, body });
    setError(r.success ? null : (r.error.issues[0]?.message ?? "Revisá la carta"));
    return r.success;
  };
  const run = async (fn: () => Promise<void>) => {
    if (!valid()) return;
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      toast(e instanceof ApiRequestError ? e.message : "No se pudo mandar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="box" id="cartas">
      <div className="box-head">
        <h2>Cartas del taller</h2>
        <span className="pill-status st-ok">
          {data.subscribers} {data.subscribers === 1 ? "suscripto" : "suscriptos"}
        </span>
      </div>
      <div className="stack">
        <div className="conn">
          <span className="ic">
            <Mail />
          </span>
          <div>
            <b>Una carta por mes</b>
            <span className="muted">
              Se suman desde el pie de la tienda. Cada carta lleva su link para darse de baja.
            </span>
          </div>
          <a className="btn btn-xs btn-ghost" href={adminApi.subscribersCsvUrl()} download>
            <Download className="i-sm" /> CSV
          </a>
        </div>
        <div className="field">
          <label htmlFor="nl-subject">Asunto</label>
          <input className="input" id="nl-subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="nl-body">Carta</label>
          <textarea className="input" id="nl-body" rows={6} value={body} onChange={(e) => setBody(e.target.value)} />
        </div>
        {error && (
          <span className="field-error" role="alert">
            {error}
          </span>
        )}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn btn-ghost"
            disabled={busy}
            onClick={() =>
              run(async () => {
                await adminApi.testLetter({ subject, body, email });
                toast(`Te mandamos la prueba a ${email}`, { icon: <Send className="i-sm" /> });
              })
            }
          >
            Mandarme una prueba
          </button>
          <button
            type="button"
            className="btn"
            disabled={busy || !data.subscribers}
            onClick={() =>
              run(async () => {
                if (!confirm(`¿Mandar “${subject}” a ${data.subscribers} suscriptos?`)) return;
                const r = await adminApi.sendLetter({ subject, body });
                toast(`La carta sale a ${r.recipients} suscriptos`, { icon: <Send className="i-sm" /> });
                setSubject("");
                setBody("");
                setData(await adminApi.newsletter());
              })
            }
          >
            Enviar a {data.subscribers} {data.subscribers === 1 ? "suscripto" : "suscriptos"}
          </button>
        </div>
        {data.letters.length > 0 && (
          <ul className="does" style={{ marginTop: 4 }}>
            {data.letters.map((l) => (
              <li key={l.id} style={{ justifyContent: "space-between" }}>
                <span>{l.subject}</span>
                <span className="muted" style={{ fontSize: 12.5 }}>
                  {l.sentAt ? `${shortDate(l.sentAt)} · ${l.recipients} enviadas` : "enviando…"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

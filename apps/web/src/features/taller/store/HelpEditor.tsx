"use client";

import type { HelpPage, HelpPageInput, HelpTopic } from "@mini-galu/contracts";
import { ArrowDown, ArrowUp, Check, ExternalLink, Plus, Trash2, Undo2 } from "lucide-react";
import { useState } from "react";
import { toast } from "@/features/shell/ui-store";
import { adminApi } from "@/lib/admin-api";
import { ApiRequestError } from "@/lib/api";
import { shortDate } from "@/lib/date";
import { helpError, moveSection, sameHelp, toDraft } from "./help-form";

const LABELS: Record<HelpTopic, string> = {
  cambios: "Cambios",
  "envios-y-pagos": "Envíos y pagos",
  terminos: "Términos",
  privacidad: "Privacidad",
};

/** Páginas de ayuda de la tienda (/ayuda/…): título, bajada y apartados de cada una. */
export function HelpEditor({ initial }: { initial: HelpPage[] }) {
  const [pages, setPages] = useState(initial);
  const [topic, setTopic] = useState<HelpTopic>(initial[0]?.topic ?? "cambios");
  const page = pages.find((p) => p.topic === topic) as HelpPage;
  const [draft, setDraft] = useState<HelpPageInput>(() => toDraft(page));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const dirty = !sameHelp(draft, toDraft(page));

  const pick = (t: HelpTopic) => {
    if (t === topic) return;
    if (dirty && !confirm("Tenés cambios sin guardar en esta página. ¿Descartarlos?")) return;
    const next = pages.find((p) => p.topic === t) as HelpPage;
    setTopic(t);
    setDraft(toDraft(next));
    setError(null);
  };
  const setSection = (i: number, patch: Partial<HelpPageInput["sections"][number]>) =>
    setDraft((d) => ({ ...d, sections: d.sections.map((s, j) => (j === i ? { ...s, ...patch } : s)) }));
  const run = async (fn: () => Promise<HelpPage>, done: string) => {
    setBusy(true);
    try {
      const saved = await fn();
      setPages((ps) => ps.map((p) => (p.topic === saved.topic ? saved : p)));
      setDraft(toDraft(saved));
      setError(null);
      toast(done, { icon: <Check className="i-sm" /> });
    } catch (e) {
      toast(e instanceof ApiRequestError ? e.message : "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="box help-ed" id="ayuda">
      <div className="box-head">
        <h2>Páginas de ayuda</h2>
        {page.updatedAt ? (
          <span className="pill-status st-ok">Editada el {shortDate(page.updatedAt)}</span>
        ) : (
          <span className="pill-status st-muted">Texto de base</span>
        )}
      </div>
      <div className="stack">
        <div className="seg-btns help-ed-tabs" role="group" aria-label="Página">
          {pages.map((p) => (
            <button key={p.topic} type="button" aria-pressed={p.topic === topic} onClick={() => pick(p.topic)}>
              {LABELS[p.topic]}
            </button>
          ))}
        </div>
        <div className="field">
          <label htmlFor="hp-title">Título</label>
          <input
            className="input"
            id="hp-title"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="hp-intro">Bajada</label>
          <textarea
            className="input"
            id="hp-intro"
            rows={2}
            value={draft.intro}
            onChange={(e) => setDraft({ ...draft, intro: e.target.value })}
          />
        </div>

        <ol className="help-ed-secs">
          {draft.sections.map((s, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: los apartados no tienen id; el índice es su lugar
            <li key={i} className="help-ed-sec">
              <div className="help-ed-sec-head">
                <span className="muted">
                  Apartado {i + 1}
                  {s.hidden && " · apagado"}
                </span>
                <div>
                  <label className="switch help-ed-vis">
                    Visible
                    <input
                      className="tog"
                      type="checkbox"
                      aria-label={`Mostrar el apartado ${i + 1} en la tienda`}
                      checked={!s.hidden}
                      onChange={(e) => setSection(i, { hidden: !e.target.checked || undefined })}
                    />
                  </label>
                  <button
                    type="button"
                    className="btn btn-xs btn-ghost"
                    aria-label="Subir apartado"
                    disabled={i === 0}
                    onClick={() => setDraft({ ...draft, sections: moveSection(draft.sections, i, -1) })}
                  >
                    <ArrowUp className="i-sm" />
                  </button>
                  <button
                    type="button"
                    className="btn btn-xs btn-ghost"
                    aria-label="Bajar apartado"
                    disabled={i === draft.sections.length - 1}
                    onClick={() => setDraft({ ...draft, sections: moveSection(draft.sections, i, 1) })}
                  >
                    <ArrowDown className="i-sm" />
                  </button>
                  <button
                    type="button"
                    className="btn btn-xs btn-ghost"
                    aria-label="Quitar apartado"
                    onClick={() => setDraft({ ...draft, sections: draft.sections.filter((_, j) => j !== i) })}
                  >
                    <Trash2 className="i-sm" />
                  </button>
                </div>
              </div>
              <input
                className="input"
                aria-label={`Título del apartado ${i + 1}`}
                value={s.title}
                onChange={(e) => setSection(i, { title: e.target.value })}
              />
              <textarea
                className="input"
                aria-label={`Texto del apartado ${i + 1}`}
                rows={5}
                value={s.body}
                onChange={(e) => setSection(i, { body: e.target.value })}
              />
            </li>
          ))}
        </ol>
        <button
          type="button"
          className="btn btn-sm btn-ghost"
          style={{ justifySelf: "start" }}
          onClick={() => setDraft({ ...draft, sections: [...draft.sections, { title: "", body: "" }] })}
        >
          <Plus className="i-sm" /> Sumar apartado
        </button>
        <p className="muted" style={{ margin: 0, fontSize: 12.5 }}>
          Separá los párrafos con una línea en blanco. Empezá una línea con “- ” para armar una lista.
        </p>
        {error && (
          <span className="field-error" role="alert">
            {error}
          </span>
        )}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn btn-sm"
            disabled={busy || !dirty}
            onClick={() => {
              const err = helpError(draft);
              setError(err);
              if (!err) run(() => adminApi.saveHelp(topic, draft), "Página guardada");
            }}
          >
            Guardar página
          </button>
          {dirty && (
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              disabled={busy}
              onClick={() => {
                setDraft(toDraft(page));
                setError(null);
              }}
            >
              Descartar cambios
            </button>
          )}
          {page.updatedAt && (
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              disabled={busy}
              onClick={() => {
                if (confirm("¿Volver al texto de base? Se pierde lo que editaste en esta página.")) {
                  run(() => adminApi.resetHelp(topic), "Volvió el texto de base");
                }
              }}
            >
              <Undo2 className="i-sm" /> Volver al texto de base
            </button>
          )}
          <a className="btn btn-sm btn-ghost" href={`/ayuda/${topic}`} target="_blank" rel="noreferrer">
            <ExternalLink className="i-sm" /> Ver en la tienda
          </a>
        </div>
      </div>
    </section>
  );
}

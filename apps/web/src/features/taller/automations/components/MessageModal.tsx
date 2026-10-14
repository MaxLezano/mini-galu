"use client";

import { AUTOMATION_RULES, AUTOMATION_SAMPLE, type AutomationKey, fillMessage } from "@mini-galu/contracts";
import { useEffect, useRef, useState } from "react";
import { Modal } from "@/ui/organisms/Modal";
import { insertAt } from "../automation-view";

export const MESSAGE_MODAL = "m-tpl";

type Props = {
  rule: { key: AutomationKey; message: string } | null;
  busy: boolean;
  onSave: (message: string) => void;
  onCancel: () => void;
};

/** Editar el mensaje de una regla con vista previa — admin-automatizaciones.html → #m-tpl */
export function MessageModal({ rule, busy, onSave, onCancel }: Props) {
  const [text, setText] = useState("");
  const area = useRef<HTMLTextAreaElement>(null);
  useEffect(() => setText(rule?.message ?? ""), [rule]);
  const def = rule ? AUTOMATION_RULES[rule.key] : null;
  const vars = def ? [...new Set([...def.vars])] : [];

  const insert = (v: string) => {
    const r = insertAt(text, area.current?.selectionStart ?? null, `{${v}}`);
    setText(r.text);
    requestAnimationFrame(() => {
      area.current?.focus();
      area.current?.setSelectionRange(r.cursor, r.cursor);
    });
  };

  return (
    <Modal
      id={MESSAGE_MODAL}
      label="Editar mensaje"
      title={
        <>
          Mensaje: <em>{def?.title ?? ""}</em>
        </>
      }
    >
      {rule && (
        <div className="modal-body" style={{ display: "grid", gap: 14 }}>
          <div className="field">
            <label htmlFor="tpl-txt">Mensaje</label>
            <textarea
              ref={area}
              className="input"
              id="tpl-txt"
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>
          <div className="field">
            <span className="lbl">Insertar dato</span>
            <div className="vars">
              {vars.map((v) => (
                <button type="button" key={v} onClick={() => insert(v)}>
                  {`{${v}}`}
                </button>
              ))}
            </div>
          </div>
          <section className="wa-preview" aria-label="Vista previa">
            <div className="wa-bubble">
              {fillMessage(text, AUTOMATION_SAMPLE)}
              <small>ahora ✓✓</small>
            </div>
          </section>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="btn btn-ghost" onClick={onCancel}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn"
              style={{ flex: 1 }}
              disabled={busy || !text.trim()}
              onClick={() => onSave(text)}
            >
              {busy ? "Guardando…" : "Guardar mensaje"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

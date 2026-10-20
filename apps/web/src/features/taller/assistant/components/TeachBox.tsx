import { type PendingQuestion, questionKey } from "@mini-galu/contracts";
import type { Ref } from "react";

type Props = {
  pending: PendingQuestion[];
  /** La pregunta elegida (de las pendientes) o escrita a mano. */
  question: string;
  /** La pregunta se escribe (no es una de las pendientes). */
  free: boolean;
  /** Se está corrigiendo una respuesta que ya sabe. */
  editing: boolean;
  answer: string;
  busy: boolean;
  answerRef: Ref<HTMLTextAreaElement>;
  onQuestion: (q: string, free: boolean) => void;
  onAnswer: (a: string) => void;
  onSave: () => void;
  onCancel: () => void;
};

/** Enseñale — admin-galu.html → #teach (más las otras preguntas pendientes y una pregunta libre). */
export function TeachBox({
  pending,
  question,
  free,
  editing,
  answer,
  busy,
  answerRef,
  onQuestion,
  onAnswer,
  onSave,
  onCancel,
}: Props) {
  const chosen =
    free || editing ? null : (pending.find((p) => questionKey(p.question) === questionKey(question)) ?? null);
  const others = pending.filter((p) => p !== chosen);
  return (
    <section className="box teach" id="teach">
      <div className="box-head" style={{ margin: 0 }}>
        <h2>{editing ? "Corregí la respuesta" : "Enseñale"}</h2>
      </div>
      {chosen ? (
        <div className="q">
          <b>“{chosen.question}”</b>
          <span className="muted">
            Preguntado {chosen.times === 1 ? "1 vez" : `${chosen.times} veces`} en los últimos 30 días
          </span>
        </div>
      ) : (
        <div className="field">
          <label htmlFor="teach-q">Pregunta</label>
          <input
            className="input"
            id="teach-q"
            value={question}
            maxLength={300}
            placeholder="Ej. ¿Hacen envíos al exterior?"
            onChange={(e) => onQuestion(e.target.value, true)}
          />
        </div>
      )}
      <div className="field">
        <label htmlFor="ans">Tu respuesta</label>
        <textarea
          ref={answerRef}
          className="input"
          id="ans"
          rows={3}
          maxLength={1000}
          value={answer}
          placeholder="Ej. Por ahora no hacemos a medida, pero el Vestido Samanta es ideal para comunión…"
          onChange={(e) => onAnswer(e.target.value)}
        />
        <span className="muted" style={{ fontSize: 12 }}>
          Responde aunque la escriban distinto. Podés usar {"{whatsapp}"}, {"{email}"}, {"{dias_cambio}"} o{" "}
          {"{horario_retiro}"}: van con el dato de Tienda y pagos.
        </span>
      </div>
      <button type="button" className="btn btn-sm" id="teach-save" disabled={busy} onClick={onSave}>
        {editing ? "Guardar cambios" : "Guardar respuesta"}
      </button>
      {editing ? (
        <div className="more">
          <button type="button" className="chip" onClick={onCancel}>
            Cancelar
          </button>
        </div>
      ) : (
        (others.length > 0 || chosen) && (
          <div className="more">
            {others.map((p) => (
              <button key={p.question} type="button" className="chip" onClick={() => onQuestion(p.question, false)}>
                {p.question}
              </button>
            ))}
            {chosen && (
              <button type="button" className="chip" onClick={() => onQuestion("", true)}>
                Otra pregunta
              </button>
            )}
          </div>
        )
      )}
    </section>
  );
}

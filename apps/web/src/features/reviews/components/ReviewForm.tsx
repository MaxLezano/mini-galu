import { ImagePlus, X } from "lucide-react";
import { FIT_OPTIONS, type ReviewDraft } from "../review-form";
import { StarPicker } from "./StarPicker";

type Props = {
  id: string;
  draft: ReviewDraft;
  /** URL local de la foto elegida (vista previa). */
  photoPreview: string | null;
  author: string;
  error: string | null;
  sending: boolean;
  onChange: (d: ReviewDraft) => void;
  onSubmit: () => void;
};

/** Estrellas, qué le pareció, cómo le quedó el talle y una foto (opcional). */
export function ReviewForm({ id, draft, photoPreview, author, error, sending, onChange, onSubmit }: Props) {
  const set = (p: Partial<ReviewDraft>) => onChange({ ...draft, ...p });
  return (
    <form
      className="rv-form"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <StarPicker name={`stars-${id}`} value={draft.rating} onChange={(rating) => set({ rating })} />
      <div className="field">
        <label htmlFor={`body-${id}`}>Contanos qué te pareció</label>
        <textarea
          className="input"
          id={`body-${id}`}
          maxLength={800}
          placeholder="¿Cómo le quedó? ¿Qué te gustó de la tela, el bordado o las terminaciones?"
          value={draft.body}
          onChange={(e) => set({ body: e.target.value })}
        />
      </div>
      <fieldset className="field">
        <legend className="lbl">¿Cómo le quedó el talle? (opcional)</legend>
        <div className="rv-fit">
          {FIT_OPTIONS.map(([fit, label]) => (
            <button
              key={fit}
              type="button"
              className="chip"
              aria-pressed={draft.fit === fit}
              onClick={() => set({ fit: draft.fit === fit ? null : fit })}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="rv-photo">
        {photoPreview ? (
          <figure>
            <img src={photoPreview} alt="Tu foto" />
            <button type="button" className="icon-btn" aria-label="Sacar la foto" onClick={() => set({ photo: null })}>
              <X className="i-sm" />
            </button>
          </figure>
        ) : (
          <label className="btn btn-sm btn-ghost">
            <ImagePlus className="i-sm" /> Sumar una foto (opcional)
            <input
              type="file"
              className="sr-only"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => set({ photo: e.target.files?.[0] ?? null })}
            />
          </label>
        )}
        <small className="muted">Va a aparecer como «{author}».</small>
      </div>
      {error && (
        <p className="rv-error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="btn" disabled={sending}>
        {sending ? "Enviando…" : "Enviar reseña"}
      </button>
    </form>
  );
}

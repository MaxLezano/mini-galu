import { STAR_LABELS } from "../review-form";

const STAR = "m12 2.5 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9L12 2.5Z";

/** Cinco estrellas para elegir (radios: se mueven con las flechas). */
export function StarPicker({ value, onChange, name }: { value: number; onChange: (n: number) => void; name: string }) {
  return (
    <fieldset className="field star-pick">
      <legend className="lbl">¿Cuántas estrellas?</legend>
      <div>
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className={n <= value ? "is-on" : ""}>
            <input
              type="radio"
              className="sr-only"
              name={name}
              value={n}
              checked={value === n}
              onChange={() => onChange(n)}
            />
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d={STAR} />
            </svg>
            <span className="sr-only">
              {n} {n === 1 ? "estrella" : "estrellas"}
            </span>
          </label>
        ))}
        <span className="muted" aria-live="polite">
          {STAR_LABELS[value]}
        </span>
      </div>
    </fieldset>
  );
}

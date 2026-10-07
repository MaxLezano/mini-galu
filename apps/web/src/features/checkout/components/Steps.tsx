import { Check } from "lucide-react";
import { Fragment, type ReactNode } from "react";

const LABELS = ["Tus datos", "Envío", "Pago"] as const;

/** Stepper de arriba (checkout.html → #stepper). */
export function Stepper({ step }: { step: number }) {
  return (
    <div className="stepper" role="group" aria-label="Pasos">
      {LABELS.map((label, i) => {
        const n = i + 1;
        return (
          <Fragment key={label}>
            {i > 0 && <hr />}
            <span className={n === step ? "on" : n < step ? "done" : ""} aria-current={n === step ? "step" : undefined}>
              <i>{n < step ? <Check className="i-sm" /> : n}</i>
              <b>{label}</b>
            </span>
          </Fragment>
        );
      })}
    </div>
  );
}

/** Un paso: abierto, cerrado con resumen + "Editar", o pendiente. */
export function StepCard({
  n,
  title,
  step,
  summary,
  onEdit,
  children,
}: {
  n: number;
  title: string;
  step: number;
  summary?: string;
  onEdit?: () => void;
  children: ReactNode;
}) {
  const open = step === n;
  const done = step > n;
  return (
    <section className={`step ${open ? "is-open" : ""} ${done ? "is-done" : ""}`} data-step={n} aria-label={title}>
      <div className="step-head">
        <span className="n">{done ? <Check className="i-sm" /> : n}</span>
        <h2>{title}</h2>
        {onEdit && (
          <button type="button" className="link edit" style={{ fontSize: 13 }} onClick={onEdit}>
            Editar
          </button>
        )}
        {summary && <span className="sum">{summary}</span>}
      </div>
      {open && <div className="step-body">{children}</div>}
    </section>
  );
}

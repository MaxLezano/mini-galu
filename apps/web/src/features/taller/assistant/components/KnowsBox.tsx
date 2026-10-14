import type { AssistantFact } from "@mini-galu/contracts";
import { Check, X } from "lucide-react";

/** Lo que sabe por las tools y los datos del taller (instrucciones de Galú en la API). */
const BUILT_IN = [
  "Stock, talles, precios y fotos de todo el catálogo publicado",
  "Envíos con Andreani, costos por código postal y retiro en el taller",
  "Medios de pago: tarjeta en cuotas, débito, dinero en cuenta y gift cards",
  "Estado de pedidos (pide el número)",
  "Talle según la edad o la altura de la nena",
];

type Props = { facts: AssistantFact[]; busy: boolean; onForget: (f: AssistantFact) => void };

/** Lo que ya sabe — admin-galu.html → .facts (más lo que le enseñaste, que se puede borrar). */
export function KnowsBox({ facts, busy, onForget }: Props) {
  return (
    <section className="box">
      <div className="box-head">
        <h2>Lo que ya sabe</h2>
      </div>
      <div className="facts" id="facts">
        {BUILT_IN.map((f) => (
          <div key={f}>
            <Check className="i-sm" />
            {f}
          </div>
        ))}
        {facts.map((f) => (
          <div key={f.id} className="taught">
            <Check className="i-sm" />
            <span>
              <b>{f.question}</b>
              <p>{f.answer}</p>
            </span>
            <button
              type="button"
              className="icon-btn"
              aria-label={`Olvidar "${f.question}"`}
              disabled={busy}
              onClick={() => onForget(f)}
            >
              <X className="i-sm" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

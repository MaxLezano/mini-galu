import type { AssistantFact } from "@mini-galu/contracts";
import { Check, Pencil, X } from "lucide-react";

/** Lo que sabe por el catálogo y "Tienda y pagos" (con modelo, por las tools; sin modelo, por las reglas de la tienda). */
const BUILT_IN = [
  "Stock, talles, precios y fotos de todo el catálogo publicado",
  "Colores, telas y cuidados, colecciones y lo más nuevo",
  "Envíos, retiro en el taller y cambios de talle",
  "Medios de pago: tarjeta en cuotas, débito, dinero en cuenta y gift cards",
  "Estado de pedidos (pide el número)",
  "Talle según la edad o la altura de la nena",
];

type Props = {
  facts: AssistantFact[];
  busy: boolean;
  /** La que se está corrigiendo en "Enseñale". */
  editing: string | null;
  onEdit: (f: AssistantFact) => void;
  onForget: (f: AssistantFact) => void;
};

/** Lo que ya sabe — admin-galu.html → .facts (más lo que le enseñaste, que se puede borrar). */
export function KnowsBox({ facts, busy, editing, onEdit, onForget }: Props) {
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
          <div key={f.id} className={`taught ${editing === f.id ? "is-editing" : ""}`}>
            <Check className="i-sm" />
            <span>
              <b>{f.question}</b>
              <p>{f.answer}</p>
            </span>
            <button
              type="button"
              className="icon-btn"
              aria-label={`Corregir "${f.question}"`}
              disabled={busy}
              onClick={() => onEdit(f)}
            >
              <Pencil className="i-sm" />
            </button>
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

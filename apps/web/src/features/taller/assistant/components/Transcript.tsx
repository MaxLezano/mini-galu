import { type AdminConversation, formatARS } from "@mini-galu/contracts";
import { BellRing, Receipt } from "lucide-react";
import { OUTCOME, pendingIn, sizeAlertsIn } from "../galu-view";

type Props = {
  conversation: AdminConversation | null;
  when: (iso: string) => string;
  onTeach: (question: string) => void;
};

/** La charla elegida — admin-galu.html → #transcript */
export function Transcript({ conversation: c, when, onTeach }: Props) {
  if (!c)
    return (
      <section className="box">
        <p className="empty">Cuando alguien le escriba a Galú, la charla aparece acá.</p>
      </section>
    );
  const pending = pendingIn(c);
  return (
    <section className="box">
      <div className="box-head">
        <h2 id="t-title">
          {c.who ?? "Sin cuenta"} · {when(c.lastAt)}
        </h2>
        {c.outcome && <span className={`pill-status ${OUTCOME[c.outcome].cls}`}>{OUTCOME[c.outcome].label}</span>}
      </div>
      <div className="transcript" id="transcript">
        {c.messages.map((m, i) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: los mensajes de una charla no cambian de orden
            key={i}
            className={`msg ${m.role === "user" ? "me" : "bot"} ${m.unanswered && !m.taught ? "unanswered" : ""}`}
          >
            {m.text}
          </div>
        ))}
        {pending && (
          <button
            type="button"
            className="btn btn-sm btn-rose"
            style={{ alignSelf: "center", marginTop: 10 }}
            onClick={() => onTeach(pending)}
          >
            Enseñarle la respuesta
          </button>
        )}
        {sizeAlertsIn(c).map((a) => (
          <div className="t-result" key={a}>
            <BellRing className="i-sm" />
            <span>
              Quedó en la lista de espera: <b>{a}</b>
            </span>
          </div>
        ))}
        {c.order && (
          <div className="t-result">
            <Receipt className="i-sm" />
            <span>
              Terminó en el pedido <b>#{c.order.number}</b> · {formatARS(c.order.totalCents)}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}

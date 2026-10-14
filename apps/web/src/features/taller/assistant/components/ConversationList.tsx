import type { AdminConversation } from "@mini-galu/contracts";
import { firstQuestion, OUTCOME } from "../galu-view";

type Props = {
  conversations: AdminConversation[];
  current: string | null;
  onSelect: (id: string) => void;
  /** "hace 32 min" (vacío hasta montar: depende del reloj). */
  when: (iso: string) => string;
};

/** Conversaciones — admin-galu.html → #convs */
export function ConversationList({ conversations, current, onSelect, when }: Props) {
  if (!conversations.length) return <p className="empty">Todavía no hay charlas guardadas.</p>;
  return (
    <div className="convs" id="convs">
      {conversations.map((c) => (
        <button
          key={c.id}
          type="button"
          className="conv"
          aria-current={c.id === current}
          onClick={() => onSelect(c.id)}
        >
          <span className="r">
            <b>{c.who ?? "Sin cuenta"}</b>
            {c.outcome && <span className={`pill-status ${OUTCOME[c.outcome].cls}`}>{OUTCOME[c.outcome].label}</span>}
          </span>
          <small>{firstQuestion(c)}</small>
          <small>{when(c.lastAt)}</small>
        </button>
      ))}
    </div>
  );
}

import type { AdminConversation, ConversationOutcome } from "@mini-galu/contracts";

export const OUTCOME: Record<ConversationOutcome, { label: string; cls: string }> = {
  compra: { label: "Compró", cls: "st-ok" },
  sin_respuesta: { label: "No supo", cls: "st-rose" },
  aviso: { label: "Pidió aviso", cls: "st-warn" },
};

/** "▲ 22% vs semana anterior" (o null si la semana anterior no hubo charlas). */
export function weekChange(now: number, before: number): { text: string; cls: "up" | "down" | "muted" } | null {
  if (!before) return null;
  const pct = Math.round(((now - before) / before) * 100);
  if (pct === 0) return { text: "igual que la semana anterior", cls: "muted" };
  return { text: `${pct > 0 ? "▲" : "▼"} ${Math.abs(pct)}% vs semana anterior`, cls: pct > 0 ? "up" : "down" };
}

/** Porcentaje de charlas que terminaron en compra ("23%"). */
export const boughtPercent = (bought: number, chats: number) => `${chats ? Math.round((bought / chats) * 100) : 0}%`;

/** La primera pregunta que todavía no le enseñaron, en esa charla (para "Enseñarle la respuesta"). */
export const pendingIn = (c: AdminConversation): string | null =>
  c.messages.find((m) => m.unanswered && !m.taught)?.unanswered ?? null;

/** Los avisos de talle que Galú anotó en esa charla ("Vestido Samanta · talle 6"). */
export const sizeAlertsIn = (c: AdminConversation): string[] => [
  ...new Set(c.messages.flatMap((m) => m.sizeAlert ?? [])),
];

/** La primera pregunta de la charla, para la lista. */
export const firstQuestion = (c: AdminConversation) => c.messages.find((m) => m.role === "user")?.text ?? "";

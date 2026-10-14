import { questionKey } from "@mini-galu/contracts";

/** Una pregunta sin respuesta, con cuántas veces se preguntó y los mensajes donde aparece. */
export type PendingGroup = { question: string; times: number; lastAt: string; ids: string[] };

/** Las preguntas sin respuesta, juntas por clave: la más preguntada primero (a igual cantidad, la más reciente). */
export function groupPending(rows: { id: string; question: string; at: Date }[]): PendingGroup[] {
  const groups = new Map<string, PendingGroup & { last: number }>();
  for (const r of rows) {
    const key = questionKey(r.question);
    if (!key) continue;
    const g = groups.get(key);
    if (!g) {
      groups.set(key, {
        question: r.question,
        times: 1,
        lastAt: r.at.toISOString(),
        ids: [r.id],
        last: r.at.getTime(),
      });
      continue;
    }
    g.times++;
    g.ids.push(r.id);
    // se muestra como la escribió la última vez
    if (r.at.getTime() > g.last)
      Object.assign(g, { question: r.question, lastAt: r.at.toISOString(), last: r.at.getTime() });
  }
  return [...groups.values()].sort((a, b) => b.times - a.times || b.last - a.last).map(({ last: _, ...g }) => g);
}

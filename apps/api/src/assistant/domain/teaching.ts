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

/** Palabras que no dicen de qué se pregunta ("¿Ustedes hacen envíos?" ≈ "envíos"). */
const FILLER = new Set(
  (
    "a al algo alguna alguno con como cual cuales de del el en es esta este eso estan hay hacen hola buenas buen dia " +
    "gracias la las le les lo los me mi mis o para pero por puedo pueden puede que quiero queria quisiera saber se si " +
    "son su sus te tenes tienen tiene ti tu un una uno unos unas ustedes vos y ya"
  ).split(" "),
);

/** Raíz liviana: sin plural ni la vocal final ("talles" ≈ "talle", "colores" ≈ "color", "nueva" ≈ "nuevo"). */
const stem = (w: string) => {
  const s = w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w;
  return s.length > 3 && /[aeo]$/.test(s) ? s.slice(0, -1) : s;
};

const words = (q: string) =>
  new Set(
    questionKey(q)
      .split(" ")
      .filter((w) => w && !FILLER.has(w))
      .map(stem),
  );

/** Cuánto de la pregunta enseñada tiene que aparecer, y cuánto de lo preguntado tiene que ser de eso. */
const COVERS_TAUGHT = 0.75;
const COVERS_ASKED = 0.4;

/**
 * La respuesta enseñada que corresponde a una pregunta (Galú sin modelo): la misma pregunta escrita distinto o una
 * que tiene casi todas sus palabras ("¿Hacen envíos al exterior?" ≈ "hacen envios al exterior? a Uruguay"). Si
 * ninguna se parece lo suficiente, null (mejor no responder que responder otra cosa).
 */
export function matchTaught<T extends { question: string }>(question: string, taught: T[]): T | null {
  const key = questionKey(question);
  const exact = taught.find((t) => questionKey(t.question) === key);
  if (exact) return exact;
  const asked = words(question);
  if (!asked.size) return null;
  let best: { t: T; score: number } | null = null;
  for (const t of taught) {
    const own = words(t.question);
    if (!own.size) continue;
    const shared = [...own].filter((w) => asked.has(w)).length;
    const covers = shared / own.size;
    if (covers < COVERS_TAUGHT || shared / asked.size < COVERS_ASKED) continue;
    const score = covers + shared / asked.size;
    if (!best || score > best.score) best = { t, score };
  }
  return best?.t ?? null;
}

/** Lo enseñado puede llevar {variables} de Tienda y pagos ("Escribinos al {whatsapp}"): van con su valor de ahora. */
export function fillVars(text: string, vars: Record<string, string> = {}): string {
  return text.replace(/\{(\w+)\}/g, (all, k: string) => vars[k] ?? all);
}

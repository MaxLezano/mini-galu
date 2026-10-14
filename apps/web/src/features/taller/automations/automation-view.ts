/** "Tiempo que te ahorraste": a 4 minutos por mensaje (como el mockup). */
export function timeSaved(messages: number): string {
  const min = messages * 4;
  if (min < 60) return `~${min} min`;
  return `~${Math.round(min / 60)} h`;
}

/** Inserta un dato ({nombre}) donde está el cursor del mensaje. */
export function insertAt(text: string, at: number | null, token: string): { text: string; cursor: number } {
  const p = at === null ? text.length : Math.min(Math.max(at, 0), text.length);
  return { text: text.slice(0, p) + token + text.slice(p), cursor: p + token.length };
}

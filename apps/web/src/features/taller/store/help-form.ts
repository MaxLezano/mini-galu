import { type HelpPage, type HelpPageInput, HelpPageInputSchema, type HelpSection } from "@mini-galu/contracts";

export const toDraft = (p: HelpPage): HelpPageInput => ({ title: p.title, intro: p.intro, sections: p.sections });

/** Primer problema del borrador, con el número de apartado si es de uno; null si se puede guardar. */
export function helpError(draft: HelpPageInput): string | null {
  const r = HelpPageInputSchema.safeParse(draft);
  if (r.success) return null;
  const issue = r.error.issues[0];
  if (!issue) return "Revisá la página";
  const [field, index] = issue.path;
  return field === "sections" && typeof index === "number" ? `Apartado ${index + 1}: ${issue.message}` : issue.message;
}

/** Sube (-1) o baja (+1) un apartado; en los bordes no cambia nada. */
export function moveSection(sections: HelpSection[], i: number, dir: -1 | 1): HelpSection[] {
  const j = i + dir;
  if (j < 0 || j >= sections.length) return sections;
  const next = [...sections];
  [next[i], next[j]] = [next[j] as HelpSection, next[i] as HelpSection];
  return next;
}

export const sameHelp = (a: HelpPageInput, b: HelpPageInput) => JSON.stringify(a) === JSON.stringify(b);

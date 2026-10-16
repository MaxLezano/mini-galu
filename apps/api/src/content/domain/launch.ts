import type { LaunchState } from "@mini-galu/contracts";

/** draft = borrador · scheduled = programado y por venir · past = ya salió (o ya se publicó). */
export function launchState(
  status: "draft" | "scheduled",
  startsAt: Date,
  publishedAt: Date | null,
  now: Date,
): LaunchState {
  if (status === "draft") return "draft";
  return publishedAt || startsAt <= now ? "past" : "scheduled";
}

/** Un lanzamiento programado se publica cuando llega la hora (si tiene la publicación automática). */
export function isDueForPublish(
  l: { status: "draft" | "scheduled"; autoPublish: boolean; publishedAt: Date | null; startsAt: Date },
  now: Date,
): boolean {
  return l.status === "scheduled" && l.autoPublish && !l.publishedAt && l.startsAt <= now;
}

/** El "primer día" de un lanzamiento: las 24 h desde que salió (o desde la hora programada si se publicó a mano). */
export function firstDayWindow(startsAt: Date, publishedAt: Date | null): { from: Date; to: Date } {
  const from = publishedAt ?? startsAt;
  return { from, to: new Date(from.getTime() + 24 * 60 * 60 * 1000) };
}

/** Texto sugerido para redes (mockup admin-lanzamientos). */
export function suggestSocialText(title: string, teaser: string, when: string): string {
  return `✿ ${title} ✿ ${teaser} Sale ${when} en minigalu.com.ar. Anotate y te avisamos 1 hora antes 🎀`;
}

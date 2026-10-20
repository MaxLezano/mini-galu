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

/** El adelanto se cuenta mientras el lanzamiento no salió: antes de su hora y sin las prendas publicadas. */
export function isPreviewOpen(l: { startsAt: Date; publishedAt: Date | null }, now: Date): boolean {
  return !l.publishedAt && l.startsAt > now;
}

/** Buscadores, vistas previas de links (WhatsApp, Facebook) y robots no cuentan como visita. */
export function isBot(userAgent: string | undefined): boolean {
  return !userAgent || /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|lighthouse/i.test(userAgent);
}

/** "YYYY-MM-DD" en Argentina: las visitas se cuentan una por visitante y día de acá. */
export function previewDay(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(now);
}

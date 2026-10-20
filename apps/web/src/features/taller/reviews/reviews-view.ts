import type { AdminReview } from "@mini-galu/contracts";

/** Pestañas de /taller/resenas: las nuevas primero; "En el inicio" son las de la cinta de la home. */
export const REVIEW_TABS = [
  ["pendiente", "Para revisar"],
  ["publicada", "Publicadas"],
  ["inicio", "En el inicio"],
  ["oculta", "Ocultas"],
] as const;
export type ReviewTab = (typeof REVIEW_TABS)[number][0];

export function inTab(r: AdminReview, tab: ReviewTab): boolean {
  return tab === "inicio" ? r.featured : r.status === tab;
}

export function tabCounts(list: AdminReview[]): Record<ReviewTab, number> {
  return Object.fromEntries(REVIEW_TABS.map(([t]) => [t, list.filter((r) => inTab(r, t)).length])) as Record<
    ReviewTab,
    number
  >;
}

/** Promedio de las publicadas (lo que muestran la home y las fichas). */
export function publishedAverage(list: AdminReview[]): string | null {
  const pub = list.filter((r) => r.status === "publicada");
  if (!pub.length) return null;
  return (pub.reduce((a, r) => a + r.rating, 0) / pub.length).toFixed(1).replace(".", ",");
}

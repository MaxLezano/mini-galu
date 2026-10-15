import { z } from "zod";

/** Páginas de ayuda de la tienda (`/ayuda/<tema>`), editables desde "Tienda y pagos" en el panel. */
export const HELP_TOPICS = ["cambios", "envios-y-pagos", "terminos", "privacidad"] as const;
export const HelpTopicSchema = z.enum(HELP_TOPICS);
export type HelpTopic = z.infer<typeof HelpTopicSchema>;

export const HelpSectionSchema = z.object({
  title: z.string().trim().min(2, "Cada apartado necesita un título").max(80, "El título es muy largo"),
  /** Párrafos separados por una línea en blanco; las líneas que empiezan con "- " son una lista. */
  body: z.string().trim().min(2, "Cada apartado necesita texto").max(4000, "El apartado es muy largo"),
  /** Apagado desde el panel: se guarda pero no se muestra en la tienda. */
  hidden: z.boolean().optional(),
});
export type HelpSection = z.infer<typeof HelpSectionSchema>;

export const HelpPageInputSchema = z.object({
  title: z.string().trim().min(2, "Poné un título").max(60, "El título es muy largo"),
  intro: z.string().trim().max(400, "La bajada es muy larga"),
  sections: z.array(HelpSectionSchema).min(1, "Sumá al menos un apartado").max(20, "Hasta 20 apartados"),
});
export type HelpPageInput = z.infer<typeof HelpPageInputSchema>;

export const HelpPageSchema = HelpPageInputSchema.extend({
  topic: HelpTopicSchema,
  /** null: todavía es el texto de base (nadie lo editó desde el panel). */
  updatedAt: z.string().nullable(),
});
export type HelpPage = z.infer<typeof HelpPageSchema>;

/** Índice para la navegación entre páginas de ayuda. */
export const HelpLinkSchema = z.object({ topic: HelpTopicSchema, title: z.string() });
export type HelpLink = z.infer<typeof HelpLinkSchema>;

/**
 * El apartado de arrepentimiento es obligatorio para las tiendas online (Ley 24.240, art. 34, y Res. SCI 424/2020):
 * en "Cambios y devoluciones" no se puede apagar ni quitar.
 */
export const isWithdrawalSection = (topic: HelpTopic, s: Pick<HelpSection, "title">) =>
  topic === "cambios" && /arrepent/i.test(s.title);

/** Por qué no se puede guardar la página sin el apartado de arrepentimiento (null si está bien). */
export function withdrawalError(topic: HelpTopic, page: Pick<HelpPageInput, "sections">): string | null {
  if (topic !== "cambios") return null;
  return page.sections.some((s) => !s.hidden && isWithdrawalSection(topic, s))
    ? null
    : "El apartado de arrepentimiento es obligatorio por ley (Ley 24.240 y Res. SCI 424/2020): dejalo visible";
}

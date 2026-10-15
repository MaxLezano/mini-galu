import { z } from "zod";

/** Páginas de ayuda de la tienda (`/ayuda/<tema>`), editables desde "Tienda y pagos" en el panel. */
export const HELP_TOPICS = ["cambios", "envios-y-pagos", "terminos", "privacidad"] as const;
export const HelpTopicSchema = z.enum(HELP_TOPICS);
export type HelpTopic = z.infer<typeof HelpTopicSchema>;

export const HelpSectionSchema = z.object({
  title: z.string().trim().min(2, "Cada apartado necesita un título").max(80, "El título es muy largo"),
  /** Párrafos separados por una línea en blanco; las líneas que empiezan con "- " son una lista. */
  body: z.string().trim().min(2, "Cada apartado necesita texto").max(4000, "El apartado es muy largo"),
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

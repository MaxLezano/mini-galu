import { z } from "zod";

/** "Cartas del taller" (footer, registro y cuenta). */
export const NewsletterSignupSchema = z.object({
  email: z.string().trim().toLowerCase().max(120).pipe(z.email("Revisá el email")),
  source: z.enum(["footer", "cuenta", "registro"]).default("footer"),
});
export type NewsletterSignup = z.input<typeof NewsletterSignupSchema>;

export const UnsubscribeSchema = z.object({ t: z.string().min(10).max(80) });

export const LetterInputSchema = z.object({
  subject: z.string().trim().min(3, "Poné un asunto").max(120),
  body: z.string().trim().min(10, "Escribí la carta").max(6000),
});
export type LetterInput = z.infer<typeof LetterInputSchema>;

export const LetterTestSchema = LetterInputSchema.extend({ email: z.email("Revisá el email") });

export type AdminNewsletter = {
  /** Suscriptos activos. */
  subscribers: number;
  letters: { id: string; subject: string; recipients: number; sentAt: string | null; createdAt: string }[];
};

import { test as base, expect } from "@playwright/test";

/** Todos los e2e fallan si React reporta un error de hidratación (server y cliente renderizaron distinto). */
export const test = base.extend<{ hydrationGuard: undefined }>({
  hydrationGuard: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on("console", (m) => {
        if (m.type() === "error" && /hydrat/i.test(m.text())) errors.push(m.text().slice(0, 500));
      });
      await use(undefined);
      expect(errors, "errores de hidratación").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

export const ADMIN = {
  email: process.env.ADMIN_EMAIL || "gaby@minigalu.com.ar",
  password: process.env.ADMIN_PASSWORD || "taller-mini-galu",
};

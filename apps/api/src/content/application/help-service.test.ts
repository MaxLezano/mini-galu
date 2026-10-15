import { HELP_TOPICS, type HelpPageInput, type HelpTopic } from "@mini-galu/contracts";
import { describe, expect, it } from "vitest";
import type { HelpRepository, StoredHelpPage } from "./help-ports";
import { HelpService } from "./help-service";

class MemoryHelp implements HelpRepository {
  pages = new Map<HelpTopic, StoredHelpPage>();
  async findAll() {
    return new Map(this.pages);
  }
  async save(topic: HelpTopic, page: HelpPageInput) {
    this.pages.set(topic, { page, updatedAt: new Date("2026-10-14T15:00:00Z") });
  }
  async remove(topic: HelpTopic) {
    this.pages.delete(topic);
  }
}

const facts = { workshop: "Villa Crespo", freeShippingFrom: "$ 90.000", email: "hola@minigalu.com.ar" };
const edited: HelpPageInput = {
  title: "Cambios",
  intro: "Hasta 15 días.",
  sections: [{ title: "Plazo", body: "15 días desde que lo recibís." }],
};

describe("HelpService", () => {
  it("sin editar, cada página tiene su texto de base con los datos de la tienda", async () => {
    const help = new HelpService(new MemoryHelp(), facts);
    const pages = await help.all();
    expect(pages.map((p) => p.topic)).toEqual([...HELP_TOPICS]);
    expect(pages.every((p) => p.updatedAt === null && p.sections.length > 0)).toBe(true);
    const envios = await help.page("envios-y-pagos");
    expect(envios.intro).toContain("$ 90.000");
    expect(JSON.stringify(await help.page("cambios"))).toContain("10 días corridos");
  });

  it("lo que guarda Gaby reemplaza al texto de base y se puede volver atrás", async () => {
    const help = new HelpService(new MemoryHelp(), facts);
    const saved = await help.save("cambios", edited);
    expect(saved).toMatchObject({ topic: "cambios", title: "Cambios", updatedAt: "2026-10-14T15:00:00.000Z" });
    expect((await help.links()).find((l) => l.topic === "cambios")?.title).toBe("Cambios");
    expect((await help.page("terminos")).updatedAt).toBeNull();

    const reset = await help.reset("cambios");
    expect(reset.title).toBe("Cambios y devoluciones");
    expect(reset.updatedAt).toBeNull();
  });
});

import {
  DEFAULT_POLICIES,
  HELP_TOPICS,
  type HelpPageInput,
  type HelpTopic,
  type StorePolicies,
} from "@mini-galu/contracts";
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

const factsWith = (policies: StorePolicies) => async () => ({
  workshop: "Villa Crespo",
  email: "hola@minigalu.com.ar",
  policies,
});
const facts = factsWith(DEFAULT_POLICIES);
const edited: HelpPageInput = {
  title: "Cambios",
  intro: "Hasta 15 días.",
  sections: [
    { title: "Plazo", body: "15 días desde que lo recibís." },
    { title: "Arrepentimiento", body: "10 días corridos desde que lo recibís." },
  ],
};

describe("HelpService", () => {
  it("sin editar, cada página tiene su texto de base con los datos de la tienda", async () => {
    const help = new HelpService(new MemoryHelp(), facts);
    const pages = await help.all();
    expect(pages.map((p) => p.topic)).toEqual([...HELP_TOPICS]);
    expect(pages.every((p) => p.updatedAt === null && p.sections.length > 0)).toBe(true);
    const envios = await help.page("envios-y-pagos");
    expect(envios.intro).toContain("$90.000");
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

  it("el texto de base sigue las políticas del panel", async () => {
    const help = new HelpService(
      new MemoryHelp(),
      factsWith({
        ...DEFAULT_POLICIES,
        exchangeDays: 15,
        freeShipping: { enabled: false, fromCents: 90_000_00 },
        methods: { domicilio: true, sucursal: true, taller: false },
      }),
    );
    expect((await help.page("cambios")).intro).toContain("15 días");
    const envios = JSON.stringify(await help.page("envios-y-pagos"));
    expect(envios).not.toContain("Envío gratis");
    expect(envios).not.toContain("taller de Villa Crespo");
    const conRetiro = JSON.stringify(await new HelpService(new MemoryHelp(), facts).page("envios-y-pagos"));
    expect(conRetiro).toContain("Lun a vie · 10 a 13 y 16 a 19 h");
  });

  it("los apartados apagados no se ven en la tienda, pero el de arrepentimiento no se puede apagar", async () => {
    const help = new HelpService(new MemoryHelp(), facts);
    const base = await help.page("cambios");
    const hide = (pred: (title: string) => boolean) => ({
      ...base,
      sections: base.sections.map((s) => (pred(s.title) ? { ...s, hidden: true } : s)),
    });
    await help.save(
      "cambios",
      hide((t) => t === "Si algo llegó mal"),
    );
    expect((await help.page("cambios")).sections.some((s) => s.hidden)).toBe(true);
    expect((await help.publicPage("cambios")).sections.map((s) => s.title)).not.toContain("Si algo llegó mal");

    await expect(
      help.save(
        "cambios",
        hide((t) => /arrepent/i.test(t)),
      ),
    ).rejects.toThrow("obligatorio por ley");
    await expect(
      help.save("cambios", { ...base, sections: base.sections.filter((s) => !/arrepent/i.test(s.title)) }),
    ).rejects.toThrow("obligatorio por ley");
    await expect(
      help.save(
        "terminos",
        hide(() => true),
      ),
    ).rejects.toThrow("al menos un apartado visible");
  });
});

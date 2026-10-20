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

const factsWith = (policies: StorePolicies) => async () => ({ policies });
const facts = factsWith({
  ...DEFAULT_POLICIES,
  exchangeDays: 30,
  freeShipping: { enabled: true, fromCents: 90_000_00 },
});
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
    const envios = await help.publicPage("envios-y-pagos");
    expect(envios.intro).toContain("$90.000");
    const cambios = await help.page("cambios");
    // el panel ve la variable; la tienda, el valor de Tienda y pagos
    expect(cambios.intro).toContain("{dias_cambio}");
    expect((await help.publicPage("cambios")).intro).toContain("30 días");
    // piloto: sin el apartado de arrepentimiento; "Si algo llegó mal" viene apagado
    expect(JSON.stringify(cambios)).not.toContain("arrepent");
    expect(cambios.sections.find((s) => s.title === "Si algo llegó mal")?.hidden).toBe(true);
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
        methods: { ...DEFAULT_POLICIES.methods, taller: false },
      }),
    );
    expect((await help.publicPage("cambios")).intro).toContain("15 días");
    const envios = JSON.stringify(await help.publicPage("envios-y-pagos"));
    expect(envios).not.toContain("Envío gratis");
    expect(envios).not.toContain("taller de Villa Crespo");
    const conRetiro = JSON.stringify(await new HelpService(new MemoryHelp(), facts).publicPage("envios-y-pagos"));
    expect(conRetiro).toContain("Lun a vie · 10 a 13 y 16 a 19 h");
  });

  it("lo que escribe Gaby con {variables} sigue los ajustes; lo demás entre llaves queda igual", async () => {
    const help = new HelpService(
      new MemoryHelp(),
      factsWith({ ...DEFAULT_POLICIES, giftcardMonths: 1, contact: { ...DEFAULT_POLICIES.contact, email: "a@b.com" } }),
    );
    await help.save("terminos", {
      title: "Términos",
      intro: "",
      sections: [{ title: "Gift cards", body: "Valen {meses_gift_card}. Dudas a {email}. {otra} sin tocar." }],
    });
    expect((await help.publicPage("terminos")).sections[0]?.body).toBe(
      "Valen 1 mes. Dudas a a@b.com. {otra} sin tocar.",
    );
    expect((await help.page("terminos")).sections[0]?.body).toContain("{meses_gift_card}");
  });

  it("los apartados apagados no se ven en la tienda y se pueden apagar todos menos uno", async () => {
    const help = new HelpService(new MemoryHelp(), facts);
    const base = await help.page("cambios");
    const hide = (pred: (title: string) => boolean) => ({
      ...base,
      sections: base.sections.map((s) => (pred(s.title) ? { ...s, hidden: true } : s)),
    });
    await help.save(
      "cambios",
      hide((t) => t === "Cómo pedir un cambio"),
    );
    expect((await help.page("cambios")).sections.find((s) => s.title === "Cómo pedir un cambio")?.hidden).toBe(true);
    expect((await help.publicPage("cambios")).sections.map((s) => s.title)).not.toContain("Cómo pedir un cambio");
    await expect(
      help.save(
        "terminos",
        hide(() => true),
      ),
    ).rejects.toThrow("al menos un apartado visible");
  });
});

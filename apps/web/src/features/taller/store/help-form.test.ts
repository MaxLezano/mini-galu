import { describe, expect, it } from "vitest";
import { helpError, moveSection, sameHelp } from "./help-form";

const draft = {
  title: "Cambios",
  intro: "",
  sections: [
    { title: "Plazo", body: "30 días." },
    { title: "Cómo", body: "Escribinos." },
  ],
};

describe("help-form", () => {
  it("valida y dice en qué apartado está el problema", () => {
    expect(helpError("terminos", draft)).toBeNull();
    expect(helpError("terminos", { ...draft, title: "" })).toBe("Poné un título");
    expect(
      helpError("terminos", {
        ...draft,
        sections: [
          { title: "Plazo", body: "30 días." },
          { title: "Cómo", body: "" },
        ],
      }),
    ).toBe("Apartado 2: Cada apartado necesita texto");
    expect(helpError("terminos", { ...draft, sections: [] })).toBe("Sumá al menos un apartado");
  });

  it("mueve apartados sin salirse de los bordes", () => {
    expect(moveSection(draft.sections, 1, -1).map((s) => s.title)).toEqual(["Cómo", "Plazo"]);
    expect(moveSection(draft.sections, 0, -1)).toBe(draft.sections);
    expect(moveSection(draft.sections, 1, 1)).toBe(draft.sections);
  });

  it("detecta si hay cambios sin guardar", () => {
    expect(sameHelp(draft, { ...draft })).toBe(true);
    expect(sameHelp(draft, { ...draft, intro: "Nueva" })).toBe(false);
  });

  it("no deja guardar Cambios sin el apartado de arrepentimiento visible", () => {
    const cambios = {
      title: "Cambios",
      intro: "",
      sections: [
        { title: "Plazo", body: "30 días." },
        { title: "Arrepentimiento de compra", body: "10 días corridos." },
      ],
    };
    expect(helpError("cambios", cambios)).toBeNull();
    const hidden = { ...cambios, sections: cambios.sections.map((s) => ({ ...s, hidden: /Arrep/.test(s.title) })) };
    expect(helpError("cambios", hidden)).toMatch(/obligatorio por ley/);
    expect(
      helpError("cambios", { ...cambios, sections: [cambios.sections[0] as (typeof cambios.sections)[0]] }),
    ).toMatch(/obligatorio por ley/);
    expect(helpError("terminos", { ...cambios, sections: [{ title: "Uno", body: "Texto.", hidden: true }] })).toBe(
      "Dejá al menos un apartado visible",
    );
  });
});

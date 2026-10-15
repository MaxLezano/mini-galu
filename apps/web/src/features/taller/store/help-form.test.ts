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
    expect(helpError(draft)).toBeNull();
    expect(helpError({ ...draft, title: "" })).toBe("Poné un título");
    expect(
      helpError({
        ...draft,
        sections: [
          { title: "Plazo", body: "30 días." },
          { title: "Cómo", body: "" },
        ],
      }),
    ).toBe("Apartado 2: Cada apartado necesita texto");
    expect(helpError({ ...draft, sections: [] })).toBe("Sumá al menos un apartado");
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
});

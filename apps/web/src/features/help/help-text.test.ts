import { describe, expect, it } from "vitest";
import { helpBlocks, helpInline, sectionId } from "./help-text";

describe("helpBlocks", () => {
  it("separa párrafos por línea en blanco y junta las líneas de un mismo párrafo", () => {
    expect(helpBlocks("Uno\nsigue.\n\nDos.")).toEqual([
      { kind: "p", text: "Uno sigue." },
      { kind: "p", text: "Dos." },
    ]);
  });

  it("las líneas con guion forman una lista, antes o después de un párrafo", () => {
    expect(helpBlocks("Pagás con:\n- Crédito\n- Débito\nY listo.")).toEqual([
      { kind: "p", text: "Pagás con:" },
      { kind: "ul", items: ["Crédito", "Débito"] },
      { kind: "p", text: "Y listo." },
    ]);
  });

  it("ignora espacios y renglones vacíos de más (la lista sigue)", () => {
    expect(helpBlocks("\n\n  - a  \n\n\n- b\n")).toEqual([{ kind: "ul", items: ["a", "b"] }]);
  });
});

describe("helpInline", () => {
  it("vuelve link cada https:// sin el punto que cierra la frase", () => {
    expect(helpInline("Reclamá en https://www.argentina.gob.ar/formulario. Gracias")).toEqual([
      { text: "Reclamá en " },
      { text: "argentina.gob.ar/formulario", href: "https://www.argentina.gob.ar/formulario" },
      { text: ". Gracias" },
    ]);
  });

  it("un texto sin links queda entero", () => {
    expect(helpInline("Sin links.")).toEqual([{ text: "Sin links." }]);
  });
});

describe("sectionId", () => {
  it("arma un ancla sin tildes ni signos", () => {
    expect(sectionId("¿Cómo pedir un cambio?")).toBe("como-pedir-un-cambio");
  });
});

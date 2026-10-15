import { describe, expect, it } from "vitest";
import { helpBlocks, sectionId } from "./help-text";

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

describe("sectionId", () => {
  it("arma un ancla sin tildes ni signos", () => {
    expect(sectionId("¿Cómo pedir un cambio?")).toBe("como-pedir-un-cambio");
  });
});

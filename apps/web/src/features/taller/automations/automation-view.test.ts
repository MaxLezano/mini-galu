import { describe, expect, it } from "vitest";
import { insertAt, timeSaved } from "./automation-view";

describe("automatizaciones (panel)", () => {
  it("tiempo ahorrado a 4 min por mensaje", () => {
    expect(timeSaved(0)).toBe("~0 min");
    expect(timeSaved(10)).toBe("~40 min");
    expect(timeSaved(142)).toBe("~9 h");
  });

  it("inserta el dato donde está el cursor", () => {
    expect(insertAt("Hola !", 5, "{nombre}")).toEqual({ text: "Hola {nombre}!", cursor: 13 });
    expect(insertAt("Hola", null, " {pedido}")).toEqual({ text: "Hola {pedido}", cursor: 13 });
  });
});

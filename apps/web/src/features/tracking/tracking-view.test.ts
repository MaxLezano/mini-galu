import { describe, expect, it } from "vitest";
import { handNote, headline, normalizeCode } from "./tracking-view";

describe("seguimiento", () => {
  it("titular y nota según el estado y la entrega", () => {
    expect(headline("en_camino", "domicilio").join("")).toBe("Ya salió hacia vos");
    expect(headline("listo", "acordar").join("")).toBe("Sale pronto");
    expect(headline("listo", "taller")).toEqual(["Listo para ", "retirar", ""]);
    expect(headline("entregado", "taller").join("")).toBe("¡Retirado!");
    expect(handNote("listo", "taller")).toBe("te esperamos ♡");
    expect(handNote("preparando", "domicilio")).toBe("con mucho amor ♡");
  });

  it("acepta el número como lo escriba el cliente", () => {
    expect(normalizeCode(" mg 1042 ")).toBe("MG-1042");
    expect(normalizeCode("#MG-1042")).toBe("MG-1042");
    expect(normalizeCode("1042")).toBe("MG-1042");
    expect(normalizeCode("360 001 728 133 2001")).toBe("3600017281332001");
  });
});

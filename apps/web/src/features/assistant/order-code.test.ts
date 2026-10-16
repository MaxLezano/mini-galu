import { describe, expect, it } from "vitest";
import { orderCodeIn } from "./order-code";

describe("número de pedido en el mensaje", () => {
  it("encuentra el MG como lo escriba el cliente", () => {
    expect(orderCodeIn("¿Dónde está mi pedido MG-1042?")).toBe("MG-1042");
    expect(orderCodeIn("mi compra es la mg 1042")).toBe("MG-1042");
    expect(orderCodeIn("el #1042 no llegó")).toBe("MG-1042");
    // solo el número, cuando Galú lo pidió
    expect(orderCodeIn(" 1042 ")).toBe("MG-1042");
  });

  it("acepta el número de Andreani", () => {
    expect(orderCodeIn("seguimiento 360000123456789")).toBe("360000123456789");
  });

  it("no confunde talles, edades ni precios con un pedido", () => {
    expect(orderCodeIn("¿Dónde está mi pedido?")).toBeNull();
    expect(orderCodeIn("mi nena tiene 5 años, talle 6")).toBeNull();
    expect(orderCodeIn("algo hasta 50000 pesos")).toBeNull();
    expect(orderCodeIn("envío al 1414")).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { canMove, nextStatus } from "./flow";

describe("flujo del pedido", () => {
  it("siguiente paso según el envío", () => {
    expect(nextStatus("nuevo", "domicilio")).toBe("preparando");
    expect(nextStatus("preparando", "taller")).toBe("listo");
    expect(nextStatus("listo", "domicilio")).toBe("en_camino");
    expect(nextStatus("listo", "taller")).toBe("entregado");
    expect(nextStatus("en_camino", "sucursal")).toBe("entregado");
    expect(nextStatus("entregado", "domicilio")).toBeNull();
    expect(nextStatus("esperando_pago", "domicilio")).toBeNull();
  });

  it("qué cambios puede hacer el taller", () => {
    expect(canMove("nuevo", "listo", "domicilio")).toBeNull();
    expect(canMove("listo", "nuevo", "domicilio")).toBeNull();
    expect(canMove("nuevo", "esperando_pago", "domicilio")).toContain("no puede volver");
    expect(canMove("esperando_pago", "nuevo", "domicilio")).toContain("no está pagado");
    expect(canMove("listo", "en_camino", "taller")).toContain("retira en el taller");
    expect(canMove("nuevo", "nuevo", "taller")).toContain("ya está");
  });
});

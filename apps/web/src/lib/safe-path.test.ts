import { describe, expect, it } from "vitest";
import { safePath } from "./safe-path";

describe("safePath", () => {
  it("deja pasar las páginas de la tienda", () => {
    expect(safePath("/checkout", "/cuenta")).toBe("/checkout");
    expect(safePath("/producto/mono-verde?talle=4", "/cuenta")).toBe("/producto/mono-verde?talle=4");
  });

  it("lo que el navegador toma como otro sitio vuelve a la de siempre", () => {
    for (const bad of ["//evil.com", "/\\evil.com", "/\\/evil.com", "https://evil.com", "evil.com", "/\t/evil.com"])
      expect(safePath(bad, "/cuenta")).toBe("/cuenta");
    expect(safePath(null, "/cuenta")).toBe("/cuenta");
  });

  it("con prefijo, solo páginas de esa sección", () => {
    expect(safePath("/taller", "/taller", "/taller")).toBe("/taller");
    expect(safePath("/taller/pedidos?pedido=MG-1", "/taller", "/taller")).toBe("/taller/pedidos?pedido=MG-1");
    expect(safePath("/tallerx", "/taller", "/taller")).toBe("/taller");
    expect(safePath("/cuenta", "/taller", "/taller")).toBe("/taller");
  });
});

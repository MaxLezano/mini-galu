import { describe, expect, it } from "vitest";
import { moderate, publicAuthor, reviewPath } from "./review";

describe("reseñas", () => {
  it("el nombre público lleva solo la inicial del apellido", () => {
    expect(publicAuthor("Lucía", "Fernández")).toBe("Lucía F.");
    expect(publicAuthor("María José", "de la Torre")).toBe("María D.");
    expect(publicAuthor("Ana", "")).toBe("Ana");
  });

  it("solo se destaca una publicada y al despublicarla sale de la home", () => {
    expect(moderate({ status: "pendiente", featured: false }, { status: "publicada" })).toEqual({
      status: "publicada",
      featured: false,
    });
    expect(() => moderate({ status: "pendiente", featured: false }, { featured: true })).toThrow();
    expect(moderate({ status: "publicada", featured: true }, { status: "pendiente" })).toEqual({
      status: "pendiente",
      featured: false,
    });
  });

  it("link del pedido con el token", () => {
    expect(reviewPath("MG-1035", "a b")).toBe("/resena/MG-1035?t=a%20b");
  });
});

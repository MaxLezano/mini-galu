import { describe, expect, it } from "vitest";
import { pointsHint, pointsNext, pointsToGo } from "./points";
import { DEFAULT_POLICIES } from "./policies";

const rules = DEFAULT_POLICIES.reviewPoints;

describe("puntos por reseñas", () => {
  it("cuenta cuánto suma una reseña y cuánto hace falta para el cupón", () => {
    expect(pointsHint(rules)).toBe(
      "Cada reseña que publicamos te suma 10 puntos (20 con foto). Con 100 puntos tenés un 10% de descuento.",
    );
    expect(pointsHint({ ...rules, perPhoto: 0 })).toBe(
      "Cada reseña que publicamos te suma 10 puntos. Con 100 puntos tenés un 10% de descuento.",
    );
  });

  it("lo que falta nunca es negativo", () => {
    expect(pointsToGo(rules, 30)).toBe(70);
    expect(pointsToGo(rules, 130)).toBe(0);
  });

  it("el aviso dice si ya puede canjear o cuánto le falta", () => {
    expect(pointsNext(rules, 60)).toBe("Te faltan 40 para un 10% de descuento.");
    expect(pointsNext(rules, 100)).toBe("Ya podés canjearlos por un 10% de descuento en Mi cuenta.");
  });
});

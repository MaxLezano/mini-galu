import { describe, expect, it } from "vitest";
import { matchTaught } from "./teaching";

const taught = [
  { question: "¿Hacen envíos al exterior?", answer: "Por ahora solo a la Argentina." },
  { question: "¿Cómo lavo los vestidos bordados?", answer: "A mano, con agua fría y del revés." },
  { question: "¿Tienen local a la calle?", answer: "No, somos un taller: se retira con turno." },
];

describe("matchTaught", () => {
  it("encuentra la misma pregunta escrita distinto", () => {
    expect(matchTaught("hacen envios al exterior", taught)?.answer).toBe("Por ahora solo a la Argentina.");
  });

  it("encuentra una pregunta con casi todas sus palabras (plurales y relleno aparte)", () => {
    expect(matchTaught("Hola! ustedes hacen envío al exterior? a Uruguay", taught)?.answer).toBe(
      "Por ahora solo a la Argentina.",
    );
    expect(matchTaught("como se lava el vestido bordado?", taught)?.question).toBe("¿Cómo lavo los vestidos bordados?");
    expect(matchTaught("¿tienen un local?", taught)).toBeNull();
    expect(matchTaught("tienen local a la calle en Tucumán?", taught)?.question).toBe("¿Tienen local a la calle?");
  });

  it("no responde con algo que solo comparte una palabra", () => {
    expect(matchTaught("¿Cuánto sale el envío a Córdoba?", taught)).toBeNull();
    expect(matchTaught("¿Qué vestidos tienen en talle 4 para un cumple y cuánto salen?", taught)).toBeNull();
    expect(matchTaught("hola", taught)).toBeNull();
    expect(matchTaught("¿envíos?", [])).toBeNull();
  });
});

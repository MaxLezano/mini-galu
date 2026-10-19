import type { ProductSummary } from "@mini-galu/contracts";
import { createElement as h } from "react";
import { describe, expect, it } from "vitest";
import { plainText, replyText } from "./galu-text";

const product = (name: string) => ({ name }) as ProductSummary;

describe("respuestas por reglas como texto para el panel", () => {
  it("saca las etiquetas, respeta los saltos y descarta lo que no se lee", () => {
    const node = h(
      "span",
      null,
      "¡Hola! Soy ",
      h("b", null, "Galú"),
      ".",
      h("br"),
      "Te ayudo con ",
      [h("a", { key: 1, href: "/seguimiento" }, "tu pedido"), false, null],
      " y ",
      45,
      " cosas más.",
    );
    expect(plainText(node)).toBe("¡Hola! Soy Galú.\nTe ayudo con tu pedido y 45 cosas más.");
  });

  it("junta los textos y nombra las prendas de las tarjetas", () => {
    const out = replyText([
      { kind: "text", content: h("span", null, "En talle 2 tengo ", h("b", null, "2 modelos"), ":  ") },
      { kind: "cards", products: [product("Vestido Samanta"), product("Moño Verde")] },
      { kind: "text", content: "" },
    ]);
    expect(out).toBe("En talle 2 tengo 2 modelos:\n\nVestido Samanta · Moño Verde");
  });
});

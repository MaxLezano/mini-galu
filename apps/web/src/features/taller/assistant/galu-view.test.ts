import type { AdminConversation } from "@mini-galu/contracts";
import { describe, expect, it } from "vitest";
import { boughtPercent, firstQuestion, pendingIn, sizeAlertsIn, weekChange } from "./galu-view";

const conv = (messages: AdminConversation["messages"]): AdminConversation => ({
  id: "c",
  who: null,
  startedAt: "2026-10-14T12:00:00.000Z",
  lastAt: "2026-10-14T12:00:00.000Z",
  outcome: null,
  order: null,
  messages,
});

describe("panel de Galú", () => {
  it("compara con la semana anterior", () => {
    expect(weekChange(128, 105)).toEqual({ text: "▲ 22% vs semana anterior", cls: "up" });
    expect(weekChange(5, 10)).toEqual({ text: "▼ 50% vs semana anterior", cls: "down" });
    expect(weekChange(3, 3)?.cls).toBe("muted");
    expect(weekChange(3, 0)).toBeNull();
  });

  it("porcentaje de charlas con compra", () => {
    expect(boughtPercent(29, 128)).toBe("23%");
    expect(boughtPercent(0, 0)).toBe("0%");
  });

  it("primera pregunta y lo que falta enseñarle", () => {
    const c = conv([
      { role: "user", text: "¿a medida?", unanswered: null, taught: false, sizeAlert: null },
      { role: "assistant", text: "No sé", unanswered: "¿Hacen a medida?", taught: true, sizeAlert: null },
      { role: "user", text: "¿al exterior?", unanswered: null, taught: false, sizeAlert: null },
      { role: "assistant", text: "No sé", unanswered: "¿Envían al exterior?", taught: false, sizeAlert: null },
    ]);
    expect(firstQuestion(c)).toBe("¿a medida?");
    expect(pendingIn(c)).toBe("¿Envían al exterior?");
    expect(pendingIn(conv([]))).toBeNull();
  });

  it("los avisos de talle anotados en la charla, sin repetir", () => {
    const aviso = { role: "assistant", text: "¡Listo!", unanswered: null, taught: false } as const;
    const c = conv([
      { ...aviso, sizeAlert: "Vestido Samanta · talle 6" },
      { ...aviso, sizeAlert: null },
      { ...aviso, sizeAlert: "Vestido Samanta · talle 6" },
    ]);
    expect(sizeAlertsIn(c)).toEqual(["Vestido Samanta · talle 6"]);
  });
});

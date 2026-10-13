import { describe, expect, it } from "vitest";
import { fromArInputs, launchWhen, relativeWhen, toArInputs } from "./date";

describe("fechas en hora de Argentina", () => {
  it("ida y vuelta entre ISO y los inputs del formulario", () => {
    expect(toArInputs("2026-10-18T13:00:00.000Z")).toEqual({ date: "2026-10-18", time: "10:00" });
    expect(new Date(fromArInputs("2026-10-18", "10:00")).toISOString()).toBe("2026-10-18T13:00:00.000Z");
  });

  it("formatea el día del lanzamiento", () => {
    expect(launchWhen("2026-10-18T13:00:00.000Z")).toBe("domingo, 18 de octubre · 10 h");
  });
});

describe("relativeWhen", () => {
  const now = new Date("2026-10-13T15:00:00-03:00").getTime();
  it("dice cuándo pasó, en hora de Argentina", () => {
    expect(relativeWhen("2026-10-13T14:59:30-03:00", now)).toBe("recién");
    expect(relativeWhen("2026-10-13T14:35:00-03:00", now)).toBe("hace 25 min");
    expect(relativeWhen("2026-10-13T09:00:00-03:00", now)).toBe("hace 6 h");
    expect(relativeWhen("2026-10-12T22:00:00-03:00", now)).toBe("ayer");
    expect(relativeWhen("2026-10-04T10:00:00-03:00", now)).toBe("4 oct");
  });
});

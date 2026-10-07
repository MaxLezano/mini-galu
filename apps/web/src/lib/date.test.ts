import { describe, expect, it } from "vitest";
import { fromArInputs, launchWhen, toArInputs } from "./date";

describe("fechas en hora de Argentina", () => {
  it("ida y vuelta entre ISO y los inputs del formulario", () => {
    expect(toArInputs("2026-10-18T13:00:00.000Z")).toEqual({ date: "2026-10-18", time: "10:00" });
    expect(new Date(fromArInputs("2026-10-18", "10:00")).toISOString()).toBe("2026-10-18T13:00:00.000Z");
  });

  it("formatea el día del lanzamiento", () => {
    expect(launchWhen("2026-10-18T13:00:00.000Z")).toBe("domingo, 18 de octubre · 10 h");
  });
});

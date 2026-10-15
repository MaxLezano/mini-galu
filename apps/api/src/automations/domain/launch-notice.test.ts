import { describe, expect, it } from "vitest";
import { launchHour } from "./launch-notice";

describe("launchHour", () => {
  it("muestra la hora de Argentina, con minutos solo si no es en punto", () => {
    expect(launchHour(new Date("2026-10-20T22:00:00Z"))).toBe("19 h");
    expect(launchHour(new Date("2026-10-20T22:30:00Z"))).toBe("19:30 h");
    expect(launchHour(new Date("2026-10-21T12:05:00Z"))).toBe("9:05 h");
  });
});

import { DEFAULT_POLICIES } from "@mini-galu/contracts";
import { describe, expect, it } from "vitest";
import { isValidSlot, pickupSlots, slotLabel } from "./pickup";

const HOURS = DEFAULT_POLICIES.pickupHours;

describe("slotLabel", () => {
  it("convierte el id de la franja en texto", () => {
    expect(slotLabel("2026-10-08T10-13")).toBe("Jue 8 · 10 a 13 h");
    expect(slotLabel("cualquier cosa")).toBeNull();
  });
});

describe("pickupSlots", () => {
  it("arranca mañana en hora argentina y salta el domingo", () => {
    // viernes 9/10 a las 22 h en Argentina (sábado 01 h UTC)
    const slots = pickupSlots(new Date("2026-10-10T01:00:00Z"), HOURS);
    expect(slots.map((s) => s.label)).toEqual([
      "Sáb 10 · 10 a 13 h",
      "Lun 12 · 10 a 13 h",
      "Lun 12 · 16 a 19 h",
      "Mar 13 · 10 a 13 h",
    ]);
    expect(slots[0]?.id).toBe("2026-10-10T10-13");
  });

  it("solo acepta franjas que se ofrecen", () => {
    const now = new Date("2026-10-07T15:00:00Z");
    expect(isValidSlot("2026-10-08T10-13", now, HOURS)).toBe(true);
    expect(isValidSlot("2026-10-07T10-13", now, HOURS)).toBe(false);
    expect(isValidSlot("2026-10-11T10-13", now, HOURS)).toBe(false);
  });

  it("usa los horarios que cargó Gaby", () => {
    const onlyWednesday = [[], [], [], [[15, 18]], [], [], []] as [number, number][][];
    const slots = pickupSlots(new Date("2026-10-10T01:00:00Z"), onlyWednesday, 2);
    expect(slots.map((s) => s.label)).toEqual(["Mié 14 · 15 a 18 h", "Mié 21 · 15 a 18 h"]);
    expect(pickupSlots(new Date("2026-10-10T01:00:00Z"), [[], [], [], [], [], [], []])).toEqual([]);
  });
});

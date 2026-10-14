import { describe, expect, it } from "vitest";
import { argentinaNow, nextBirthday } from "./birthday";

describe("próximo cumple", () => {
  const now = new Date("2026-10-14T12:00:00-03:00");

  it("cuenta los días desde hoy en Argentina", () => {
    expect(nextBirthday("2021-10-29", now)).toEqual({ days: 15, year: 2026 });
    expect(nextBirthday("2021-10-14", now)).toEqual({ days: 0, year: 2026 });
    // a las 23 h de Argentina ya es 15 en UTC, pero acá sigue siendo 14
    expect(nextBirthday("2021-10-29", new Date("2026-10-14T23:30:00-03:00")).days).toBe(15);
  });

  it("si ya pasó este año, es el del año que viene", () => {
    expect(nextBirthday("2020-10-13", now)).toEqual({ days: 364, year: 2027 });
    expect(nextBirthday("2022-01-05", new Date("2026-12-28T10:00:00-03:00"))).toEqual({ days: 8, year: 2027 });
  });

  it("29 de febrero: el 28 en los años no bisiestos", () => {
    expect(nextBirthday("2020-02-29", new Date("2027-02-20T10:00:00-03:00"))).toEqual({ days: 8, year: 2027 });
    expect(nextBirthday("2020-02-29", new Date("2028-02-20T10:00:00-03:00"))).toEqual({ days: 9, year: 2028 });
  });

  it("hora de Argentina", () => {
    expect(argentinaNow(new Date("2026-10-15T02:00:00Z"))).toMatchObject({ day: 14, hour: 23 });
  });
});

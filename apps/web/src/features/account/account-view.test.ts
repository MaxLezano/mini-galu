import { describe, expect, it } from "vitest";
import { ageOf, birthdayLabel, daysToBirthday, memberSince } from "./account-view";

describe("mi cuenta", () => {
  const now = new Date(2026, 9, 14); // 14 de octubre de 2026

  it("edad y próximo cumple", () => {
    expect(ageOf("2021-11-14", now)).toBe(4);
    expect(ageOf("2021-10-14", now)).toBe(5);
    expect(birthdayLabel("2021-11-14")).toBe("14 de noviembre");
    expect(daysToBirthday("2021-11-14", now)).toBe(31);
    expect(daysToBirthday("2021-10-14", now)).toBe(0);
    expect(daysToBirthday("2021-10-13", now)).toBe(364);
  });

  it("cliente desde", () => {
    expect(memberSince("2026-05-03T12:00:00Z")).toBe("mayo 2026");
  });
});

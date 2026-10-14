import { describe, expect, it } from "vitest";
import { AssistantChatSchema, recommendSize } from "./assistant";

describe("recommendSize", () => {
  it("usa el mayor entre altura y edad", () => {
    expect(recommendSize(5, 112)).toBe("6");
    expect(recommendSize(4, 125)).toBe("8");
    expect(recommendSize(1, 75)).toBe("12m");
    expect(recommendSize(10, 150)).toBe("10");
  });

  it("con un solo dato, usa ese", () => {
    expect(recommendSize(3, null)).toBe("4");
    expect(recommendSize(null, 100)).toBe("4");
    expect(recommendSize(null, null)).toBe("10");
  });
});

describe("AssistantChatSchema", () => {
  it("el último mensaje es la pregunta y se recortan los viejos", () => {
    const many = Array.from({ length: 20 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", text: `m${i}` }));
    const ok = AssistantChatSchema.parse({ messages: [...many, { role: "user", text: "¿talle 6?" }] });
    expect(ok.messages).toHaveLength(12);
    expect(AssistantChatSchema.safeParse({ messages: [{ role: "assistant", text: "hola" }] }).success).toBe(false);
    expect(AssistantChatSchema.safeParse({ messages: [{ role: "user", text: "x".repeat(501) }] }).success).toBe(false);
  });
});

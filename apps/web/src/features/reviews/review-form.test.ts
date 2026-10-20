import { describe, expect, it } from "vitest";
import { draftError, draftForm, emptyDraft } from "./review-form";

describe("form de reseña", () => {
  it("pide las estrellas y un texto de al menos 10 letras", () => {
    expect(draftError(emptyDraft())).toBe("Elegí las estrellas");
    expect(draftError({ ...emptyDraft(), rating: 5, body: "Lindo" })).toMatch(/Contanos un poquito más/);
    expect(draftError({ ...emptyDraft(), rating: 5, body: "Le quedó divino" })).toBeNull();
  });

  it("arma el multipart con la foto y sin talle si no lo eligió", () => {
    const photo = new File([new Uint8Array([1])], "nena.jpg", { type: "image/jpeg" });
    const f = draftForm({ rating: 4, body: "  Le quedó divino  ", fit: null, photo });
    expect(f.get("rating")).toBe("4");
    expect(f.get("body")).toBe("Le quedó divino");
    expect(f.has("fit")).toBe(false);
    expect((f.get("photo") as File).name).toBe("nena.jpg");
  });
});

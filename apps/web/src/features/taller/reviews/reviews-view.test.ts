import type { AdminReview } from "@mini-galu/contracts";
import { describe, expect, it } from "vitest";
import { inTab, publishedAverage, tabCounts } from "./reviews-view";

const rv = (over: Partial<AdminReview>): AdminReview => ({
  id: "r",
  status: "pendiente",
  featured: false,
  rating: 5,
  title: "",
  body: "Divino",
  author: "Lucía F.",
  city: null,
  size: "6",
  fit: null,
  photoUrl: null,
  product: { slug: "maddie", name: "Vestido Maddie", imageUrl: null },
  orderNumber: "MG-1035",
  createdAt: "2026-10-14T12:00:00.000Z",
  ...over,
});

describe("reseñas del panel", () => {
  const list = [
    rv({}),
    rv({ status: "publicada", featured: true, rating: 4 }),
    rv({ status: "publicada", rating: 5 }),
    rv({ status: "oculta", rating: 1 }),
  ];

  it("cuenta por pestaña: las del inicio también están en publicadas", () => {
    expect(tabCounts(list)).toEqual({ pendiente: 1, publicada: 2, inicio: 1, oculta: 1 });
    expect(inTab(list[1] as AdminReview, "inicio")).toBe(true);
  });

  it("el promedio sale solo de las publicadas", () => {
    expect(publishedAverage(list)).toBe("4,5");
    expect(publishedAverage([rv({})])).toBeNull();
  });
});

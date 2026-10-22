import { describe, expect, it } from "vitest";
import { branchMapLayout, kmLabel } from "./branch-map";

const palermo = { id: "palermo", lat: -34.5977, lng: -58.4352 };
const caballito = { id: "caballito", lat: -34.618, lng: -58.44 };
const belgrano = { id: "belgrano", lat: -34.562, lng: -58.456 };

describe("mapa de sucursales", () => {
  it("sin coordenadas no hay mapa", () => {
    expect(branchMapLayout([])).toBeNull();
    expect(branchMapLayout([{ id: "x", lat: null, lng: null }])).toBeNull();
  });

  it("entran todas las sucursales, lejos del borde, y las teselas cubren el recuadro", () => {
    const m = branchMapLayout([palermo, caballito, belgrano, { id: "sin", lat: null, lng: null }]);
    expect(m).not.toBeNull();
    if (!m) return;
    expect(m.pins.map((p) => p.id)).toEqual(["palermo", "caballito", "belgrano"]);
    for (const p of m.pins) {
      expect(p.left).toBeGreaterThan(5);
      expect(p.left).toBeLessThan(95);
      expect(p.top).toBeGreaterThan(5);
      expect(p.top).toBeLessThan(95);
    }
    // norte arriba, oeste a la izquierda
    const pin = (id: string) => m.pins.find((p) => p.id === id);
    expect(pin("belgrano")?.top).toBeLessThan(pin("caballito")?.top ?? 0);
    expect(pin("belgrano")?.left).toBeLessThan(pin("palermo")?.left ?? 0);
    expect(Math.min(...m.tiles.map((t) => t.left))).toBeLessThanOrEqual(0);
    expect(Math.min(...m.tiles.map((t) => t.top))).toBeLessThanOrEqual(0);
    expect(Math.max(...m.tiles.map((t) => t.left + t.size))).toBeGreaterThanOrEqual(100);
    expect(m.tiles[0]?.src).toMatch(/^https:\/\/tile\.openstreetmap\.org\/\d+\/\d+\/\d+\.png$/);
  });

  it("una sola sucursal queda en el centro, sin acercar de más", () => {
    const m = branchMapLayout([palermo]);
    expect(m?.zoom).toBe(15);
    expect(m?.pins[0]?.left).toBeCloseTo(50);
    expect(m?.pins[0]?.top).toBeCloseTo(50);
  });

  it("aleja el mapa cuando las sucursales están lejos", () => {
    const near = branchMapLayout([palermo, caballito])?.zoom ?? 0;
    const far = branchMapLayout([palermo, { id: "rosario", lat: -32.95, lng: -60.65 }])?.zoom ?? 0;
    expect(far).toBeLessThan(near);
  });

  it("la distancia se dice en km con coma", () => {
    expect(kmLabel(2.3)).toBe("a 2,3 km");
    expect(kmLabel(12)).toBe("a 12 km");
    expect(kmLabel(0)).toBeNull();
    expect(kmLabel(null)).toBeNull();
  });
});

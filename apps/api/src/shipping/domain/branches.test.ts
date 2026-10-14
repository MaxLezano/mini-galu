import { describe, expect, it } from "vitest";
import { type Branch, branchAddress, branchesFor, branchName } from "./branches";

const b = (id: string, cp: string, lat: number, lng: number, serves: string[] = []): Branch => ({
  id,
  name: id,
  street: "Calle",
  number: "1",
  city: "C.a.b.a.",
  province: "Buenos Aires",
  postalCode: cp,
  lat,
  lng,
  hours: null,
  servesPostalCodes: serves,
});

const palermo = b("palermo", "1414", -34.5977, -58.4352, ["1414", "1425"]);
const belgrano = b("belgrano", "1428", -34.562, -58.456);
const caballito = b("caballito", "1405", -34.618, -58.44);
const rosario = b("rosario", "2000", -32.95, -60.65, ["2000"]);
const all = [rosario, belgrano, caballito, palermo];

describe("sucursales para un código postal", () => {
  it("primero la que atiende el CP y después las más cercanas", () => {
    expect(branchesFor(all, "1414").map((x) => x.id)).toEqual(["palermo", "caballito", "belgrano", "rosario"]);
    expect(branchesFor(all, "C1425ABC", 2).map((x) => x.id)).toEqual(["palermo", "caballito"]);
  });

  it("si ninguna atiende el CP, arranca por la de código postal más parecido", () => {
    expect(branchesFor(all, "2001")[0]?.id).toBe("rosario");
    expect(branchesFor([], "1414")).toEqual([]);
  });

  it("nombre y dirección legibles", () => {
    expect(branchName("PALERMO (AV SCALABRINI ORTIZ)")).toBe("Palermo (Av Scalabrini Ortiz)");
    expect(branchAddress({ street: "Raúl Scalabrini Ortíz", number: "615", city: "C.a.b.a." })).toBe(
      "Raúl Scalabrini Ortíz 615 · C.a.b.a.",
    );
  });
});

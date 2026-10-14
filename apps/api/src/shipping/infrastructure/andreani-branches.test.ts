import { describe, expect, it } from "vitest";
import { AndreaniBranches } from "./andreani-branches";

const raw = [
  {
    id: 10010,
    descripcion: "PALERMO (AV SCALABRINI ORTIZ)",
    canal: "B2C",
    direccion: {
      calle: "Raúl Scalabrini Ortíz",
      numero: "615",
      localidad: "C.a.b.a.",
      provincia: "Buenos Aires",
      codigoPostal: "1414",
    },
    coordenadas: { latitud: "-34.597730", longitud: "-58.435200" },
    horarioDeAtencion: "Lunes a viernes de 08:00 a 18:00",
    datosAdicionales: { entregaEnvios: true },
    codigosPostalesAtendidos: ["1414"],
  },
  { id: 2, descripcion: "AVELLANEDA - C DISTRIBUCION", canal: "B2B", datosAdicionales: { entregaEnvios: false } },
  { id: 3, descripcion: "PLANTA", canal: "B2C", datosAdicionales: { entregaEnvios: false } },
];

describe("sucursales de Andreani", () => {
  it("se quedan las B2C que entregan envíos y se consultan una vez cada 12 h", async () => {
    let calls = 0;
    let now = 0;
    const fake = (async () => {
      calls++;
      return new Response(JSON.stringify(raw), { headers: { "content-type": "application/json" } });
    }) as unknown as typeof fetch;
    const dir = new AndreaniBranches("https://x", fake, () => now);
    const list = await dir.all();
    expect(list.map((b) => b.id)).toEqual(["10010"]);
    expect(list[0]).toMatchObject({
      lat: -34.59773,
      servesPostalCodes: ["1414"],
      hours: "Lunes a viernes de 08:00 a 18:00",
    });
    await Promise.all([dir.all(), dir.all()]);
    expect(calls).toBe(1);
    now = 13 * 3_600_000;
    await dir.all();
    expect(calls).toBe(2);
  });
});

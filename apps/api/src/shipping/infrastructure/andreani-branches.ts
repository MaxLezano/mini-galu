import type { BranchDirectory } from "../application/ports";
import type { Branch } from "../domain/branches";

type Raw = {
  id: number | string;
  descripcion: string;
  canal: string;
  direccion?: { calle?: string; numero?: string; localidad?: string; provincia?: string; codigoPostal?: string };
  coordenadas?: { latitud?: string; longitud?: string };
  horarioDeAtencion?: string;
  datosAdicionales?: { entregaEnvios?: boolean };
  codigosPostalesAtendidos?: string[];
};

const HOUR = 3_600_000;

/** Sucursales de Andreani (API pública /v2/sucursales, sin credenciales). Se guardan en memoria 12 h. */
export class AndreaniBranches implements BranchDirectory {
  private cache: { at: number; list: Branch[] } | null = null;
  private pending: Promise<Branch[]> | null = null;

  constructor(
    private readonly baseUrl = "https://apis.andreani.com",
    private readonly fetcher: typeof fetch = fetch,
    private readonly now: () => number = Date.now,
  ) {}

  async all(): Promise<Branch[]> {
    if (this.cache && this.now() - this.cache.at < 12 * HOUR) return this.cache.list;
    this.pending ??= this.load().finally(() => {
      this.pending = null;
    });
    return this.pending;
  }

  private async load(): Promise<Branch[]> {
    const res = await this.fetcher(`${this.baseUrl}/v2/sucursales?canal=B2C`, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`Andreani sucursales: ${res.status}`);
    const list = ((await res.json()) as Raw[])
      .filter((r) => r.canal === "B2C" && r.datosAdicionales?.entregaEnvios)
      .map(toBranch);
    this.cache = { at: this.now(), list };
    return list;
  }
}

export function toBranch(r: Raw): Branch {
  const num = (s?: string) => (s && Number.isFinite(Number(s)) ? Number(s) : null);
  return {
    id: String(r.id),
    name: r.descripcion,
    street: r.direccion?.calle ?? "",
    number: r.direccion?.numero ?? "",
    city: r.direccion?.localidad ?? "",
    province: r.direccion?.provincia ?? "",
    postalCode: r.direccion?.codigoPostal ?? "",
    lat: num(r.coordenadas?.latitud),
    lng: num(r.coordenadas?.longitud),
    hours: r.horarioDeAtencion?.trim() || null,
    servesPostalCodes: r.codigosPostalesAtendidos ?? [],
  };
}

/** Sucursales fijas para tests y CI (sin salir a internet). */
export class FakeBranches implements BranchDirectory {
  async all(): Promise<Branch[]> {
    const b = (
      id: string,
      name: string,
      street: string,
      number: string,
      cp: string,
      lat: number,
      lng: number,
      serves: string[],
    ) => ({
      id,
      name,
      street,
      number,
      city: "C.a.b.a.",
      province: "Buenos Aires",
      postalCode: cp,
      lat,
      lng,
      hours: "Lunes a viernes de 08:00 a 18:00 · Sábados de 08:00 a 13:00",
      servesPostalCodes: serves,
    });
    return [
      b("10010", "PALERMO (AV SCALABRINI ORTIZ)", "Raúl Scalabrini Ortiz", "615", "1414", -34.5977, -58.4352, [
        "1414",
        "1425",
      ]),
      b("10020", "CABALLITO (AV RIVADAVIA)", "Av. Rivadavia", "5100", "1405", -34.618, -58.44, ["1405", "1406"]),
      b("10030", "BELGRANO (AV CABILDO)", "Av. Cabildo", "2200", "1428", -34.562, -58.456, ["1428"]),
    ];
  }
}

import type { ShippingSettings } from "@mini-galu/contracts";
import { describe, expect, it } from "vitest";
import type { NewShipment } from "../../application/ports";
import { MemoryShippingSettings } from "../../testing/in-memory";
import { AndreaniClient } from "./andreani-client";
import { AndreaniGateway, AndreaniRates } from "./andreani-gateway";

const settings: ShippingSettings = {
  package: "bolsa",
  origin: { street: "Gurruchaga", number: "1234", unit: null, city: "CABA", province: "CABA", postalCode: "1414" },
  sender: { name: "Mini Galú", phone: "1155551234", email: "hola@minigalu.com.ar", taxId: "20-12345678-9" },
};
const shipment = (over: Partial<NewShipment> = {}): NewShipment => ({
  orderNumber: "MG-1042",
  method: "domicilio",
  recipient: { name: "Lucía Fernández", phone: "+5491155551234", email: "lucia@gmail.com" },
  street: "Thames 100, 2° A",
  address: { street: "Thames", number: "100", unit: "2° A" },
  city: "Palermo",
  province: "CABA",
  postalCode: "C1414ABC",
  notes: "Timbre roto",
  branch: null,
  units: 1,
  from: settings,
  ...over,
});
const cfg = { env: "qa" as const, contracts: { domicilio: "400006709", sucursal: "400006710" }, client: "CL0001" };

type Call = { url: string; init?: RequestInit };
function fakeAndreani(routes: Record<string, (c: Call) => Response>) {
  const calls: Call[] = [];
  const fetcher = (async (url: string, init?: RequestInit) => {
    const c = { url, init };
    calls.push(c);
    const path = url.replace("https://apisqa.andreani.com", "").split("?")[0] ?? "";
    const key = Object.keys(routes).find((k) => new RegExp(`^${k}$`).test(`${init?.method ?? "GET"} ${path}`));
    return key ? routes[key]?.(c) : new Response("{}", { status: 404 });
  }) as unknown as typeof fetch;
  return { calls, fetcher };
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const login = () => new Response(null, { status: 200, headers: { "x-authorization-token": "tok-1" } });

describe("Andreani (API REST)", () => {
  it("alta de la orden: login una vez, contrato según la entrega y el número de envío", async () => {
    const { calls, fetcher } = fakeAndreani({
      "GET /login": login,
      "POST /v2/ordenes-de-envio": () =>
        json({ estado: "Pendiente", bultos: [{ numeroDeEnvio: "360000101651699" }], agrupadorDeBultos: "API1" }, 202),
    });
    const gw = new AndreaniGateway(new AndreaniClient({ env: "qa", user: "u", password: "p" }, fetcher), cfg);
    expect(await gw.createShipment(shipment())).toEqual({ trackingNumber: "360000101651699" });
    await gw.createShipment(
      shipment({ method: "sucursal", address: null, branch: { id: "10010", name: "Palermo", address: "x" } }),
    );
    expect(calls.filter((c) => c.url.endsWith("/login"))).toHaveLength(1);
    expect(new Headers(calls[0]?.init?.headers).get("authorization")).toBe(`Basic ${btoa("u:p")}`);
    expect(new Headers(calls[1]?.init?.headers).get("x-authorization-token")).toBe("tok-1");

    const domicilio = JSON.parse(String(calls[1]?.init?.body));
    expect(domicilio).toMatchObject({
      contrato: "400006709",
      idPedido: "MG-1042",
      origen: { postal: { codigoPostal: "1414", calle: "Gurruchaga", numero: "1234" } },
      destino: {
        postal: { codigoPostal: "1414", calle: "Thames", numero: "100", departamento: "2° A", localidad: "Palermo" },
      },
      remitente: { nombreCompleto: "Mini Galú", documentoNumero: "20123456789", telefonos: [{ numero: "1155551234" }] },
      destinatario: [{ nombreCompleto: "Lucía Fernández", telefonos: [{ tipo: 2, numero: "1155551234" }] }],
      bultos: [{ kilos: 0.5, volumenCm: 6000 }],
    });
    const sucursal = JSON.parse(String(calls[2]?.init?.body));
    expect(sucursal).toMatchObject({ contrato: "400006710", destino: { sucursal: { id: "10010" } } });
  });

  it("sin los datos de envío del panel no da de alta nada; los errores de validación se muestran", async () => {
    const { fetcher } = fakeAndreani({
      "GET /login": login,
      "POST /v2/ordenes-de-envio": () =>
        json([{ code: "400", property: "destino", message: "Código postal inválido" }], 400),
    });
    const gw = new AndreaniGateway(new AndreaniClient({ env: "qa", user: "u", password: "p" }, fetcher), cfg);
    await expect(gw.createShipment(shipment({ from: null }))).rejects.toThrow("Tienda y pagos");
    await expect(gw.createShipment(shipment())).rejects.toThrow("Andreani: Código postal inválido");
  });

  it("si el token venció, se vuelve a loguear una vez; usuario incorrecto da un error claro", async () => {
    let n = 0;
    const { calls, fetcher } = fakeAndreani({
      "GET /login": login,
      "GET /v3/envios/.+/trazas": () =>
        n++ === 0
          ? json({}, 401)
          : json({ eventos: [{ Fecha: "2025-10-05T16:30:00", Ciclo: "Distribution", Evento: "Admision" }] }),
    });
    const gw = new AndreaniGateway(new AndreaniClient({ env: "qa", user: "u", password: "p" }, fetcher), cfg);
    expect((await gw.events("360000101651699")).map((e) => e.code)).toEqual(["picked_up"]);
    expect(calls.filter((c) => c.url.endsWith("/login"))).toHaveLength(2);
    expect(gw.trackingUrl("360000101651699")).toBe("https://www.andreani.com/envio/360000101651699");

    const bad = fakeAndreani({ "GET /login": () => new Response(null, { status: 401 }) });
    const gw2 = new AndreaniGateway(new AndreaniClient({ env: "qa", user: "u", password: "mal" }, bad.fetcher), cfg);
    await expect(gw2.events("1")).rejects.toThrow("usuario o la contraseña");
  });

  it("etiqueta en PDF", async () => {
    const { calls, fetcher } = fakeAndreani({
      "GET /login": login,
      "GET /v2/ordenes-de-envio/.+/etiquetas": () => new Response(new Uint8Array([37, 80, 68, 70]), { status: 200 }),
    });
    const gw = new AndreaniGateway(new AndreaniClient({ env: "qa", user: "u", password: "p" }, fetcher), cfg);
    expect(new TextDecoder().decode(await gw.label("360000101651699"))).toBe("%PDF");
    expect(new Headers(calls[1]?.init?.headers).get("accept")).toBe("application/pdf");
  });

  it("cotiza con el contrato de cada entrega y, si Andreani falla, no hay precio", async () => {
    const store = new MemoryShippingSettings();
    await store.save({ ...settings, package: "caja_chica" });
    const { calls, fetcher } = fakeAndreani({
      "GET /login": login,
      "GET /v1/tarifas": (c) =>
        json({
          tarifaConIva: { total: new URL(c.url).searchParams.get("contrato") === "400006709" ? "7041.21" : "5200" },
        }),
    });
    const rates = new AndreaniRates(new AndreaniClient({ env: "qa", user: "u", password: "p" }, fetcher), cfg, store);
    const q = await rates.quote("1414");
    expect(q?.domicilio.cents).toBe(704_121);
    expect(q?.sucursal.cents).toBe(520_000);
    const params = new URL(calls[1]?.url ?? "").searchParams;
    expect(params.get("cliente")).toBe("CL0001");
    expect(params.get("bultos[0][kilos]")).toBe("1");
    expect(params.get("bultos[0][volumen]")).toBe(String(25 * 20 * 8));

    const down = fakeAndreani({ "GET /login": login, "GET /v1/tarifas": () => json({}, 500) });
    // si Andreani no cotiza no hay precio: no se inventa uno
    const failing = new AndreaniRates(
      new AndreaniClient({ env: "qa", user: "u", password: "p" }, down.fetcher),
      cfg,
      store,
    );
    expect(await failing.quote("1414")).toBeNull();
  });
});

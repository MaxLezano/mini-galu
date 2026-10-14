import { describe, expect, it } from "vitest";
import type { NewShipment } from "../application/ports";
import { FakeAndreani } from "./fake-andreani";

const shipment = (method: "domicilio" | "sucursal"): NewShipment => ({
  orderNumber: "MG-1042",
  method,
  recipient: { name: "Lucía Fernández", phone: "+5491155551234", email: "lucia@gmail.com" },
  street: method === "domicilio" ? "Gurruchaga 1234, 3° B" : null,
  address: method === "domicilio" ? { street: "Gurruchaga", number: "1234", unit: "3° B" } : null,
  city: method === "domicilio" ? "CABA" : null,
  province: "CABA",
  postalCode: "1414",
  notes: null,
  branch:
    method === "sucursal"
      ? { id: "10010", name: "Palermo (Av Scalabrini Ortiz)", address: "Raúl Scalabrini Ortiz 615" }
      : null,
  units: 2,
  from: null,
});

describe("FakeAndreani", () => {
  it("el recorrido sale del número de seguimiento y avanza con el reloj", async () => {
    let now = new Date("2026-10-05T11:00:00-03:00");
    const andreani = new FakeAndreani(() => now);
    const { trackingNumber } = await andreani.createShipment(shipment("domicilio"));
    expect(trackingNumber).toMatch(/^3\d{14}$/);
    expect(await andreani.events(trackingNumber)).toEqual([]);
    now = new Date(now.getTime() + 8 * 3_600_000);
    expect((await andreani.events(trackingNumber)).map((e) => e.code)).toEqual(["picked_up", "hub"]);
    now = new Date(now.getTime() + 60 * 3_600_000);
    expect((await andreani.events(trackingNumber)).at(-1)?.code).toBe("delivered");
    // otra instancia (API reiniciada) ve lo mismo
    expect(await new FakeAndreani(() => now).events(trackingNumber)).toHaveLength(5);
  });

  it("a sucursal pasa por 'listo para retirar en la sucursal' y se acelera con speed", async () => {
    let now = new Date("2026-10-05T11:00:00-03:00");
    const andreani = new FakeAndreani(() => now, 60);
    const { trackingNumber } = await andreani.createShipment(shipment("sucursal"));
    now = new Date(now.getTime() + 41 * 60_000); // 41 min = 41 h del correo
    expect((await andreani.events(trackingNumber)).at(-1)?.code).toBe("at_branch");
  });

  it("arma la etiqueta PDF", async () => {
    const andreani = new FakeAndreani();
    const pdf = await andreani.label("360000000000001", shipment("domicilio"));
    expect(new TextDecoder().decode(pdf.slice(0, 5))).toBe("%PDF-");
  });
});

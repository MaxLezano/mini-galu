import { describe, expect, it } from "vitest";
import { defaultTemplate, fillTemplate, nextAction, pickingList, TEMPLATES, toPrepare, waLink } from "./order-flow";

const item = (slug: string, size: string, qty = 1) => ({
  slug,
  name: slug === "maddie" ? "Set Maddie" : "Vestido Elsa",
  size,
  qty,
  imageUrl: "",
  unitPriceCents: 1,
});

describe("order-flow", () => {
  it("siguiente paso según estado y envío", () => {
    expect(nextAction({ status: "nuevo", shippingMethod: "domicilio" })).toMatchObject({ to: "preparando" });
    expect(nextAction({ status: "preparando", shippingMethod: "taller" })).toMatchObject({
      label: "Marcar listo para retirar",
    });
    expect(nextAction({ status: "preparando", shippingMethod: "domicilio" })).toMatchObject({
      kind: "label",
      label: "Generar etiqueta Andreani",
    });
    // en camino con etiqueta: lo cierra Andreani (se ve el seguimiento); despachado a mano, se cierra a mano
    expect(
      nextAction({ status: "en_camino", shippingMethod: "domicilio", number: "MG-1042", trackingNumber: "3600" }),
    ).toMatchObject({ kind: "href", href: "/seguimiento?pedido=MG-1042" });
    expect(nextAction({ status: "en_camino", shippingMethod: "domicilio" })).toMatchObject({ to: "entregado" });
    expect(nextAction({ status: "listo", shippingMethod: "taller" })).toMatchObject({ to: "entregado" });
    expect(nextAction({ status: "listo", shippingMethod: "sucursal" })).toMatchObject({ to: "en_camino" });
    expect(nextAction({ status: "entregado", shippingMethod: "domicilio" })).toMatchObject({
      kind: "whatsapp",
      template: "resena",
    });
    expect(nextAction({ status: "esperando_pago", shippingMethod: "domicilio" })).toMatchObject({
      label: "Reenviar link de pago",
      template: "link",
    });
  });

  it("plantilla de WhatsApp según estado y con los datos del pedido", () => {
    expect(defaultTemplate({ status: "listo", shippingMethod: "taller" })).toBe("retiro");
    expect(defaultTemplate({ status: "en_camino", shippingMethod: "domicilio" })).toBe("despacho");
    const text = fillTemplate(TEMPLATES.retiro.body, {
      nombre: "Lucía",
      pedido: "MG-1001",
      seguimiento: "",
      taller: "Villa Crespo",
      horario: "Te esperamos el Jue 8 · 10 a 13 h.",
      link: "",
      vence: "",
    });
    expect(text).toBe(
      "Hola Lucía! Tu pedido #MG-1001 está listo para retirar en el taller (Villa Crespo). Te esperamos el Jue 8 · 10 a 13 h.",
    );
    expect(defaultTemplate({ status: "esperando_pago", shippingMethod: "taller" })).toBe("link");
    expect(
      fillTemplate(TEMPLATES.link.body, {
        nombre: "Paula",
        pedido: "MG-1046",
        seguimiento: "",
        taller: "",
        horario: "",
        link: "http://web/pagar/MG-1046?t=x",
        vence: "jueves 16 de octubre · 22 h",
      }),
    ).toContain("#MG-1046: http://web/pagar/MG-1046?t=x Podés pagar");
    expect(waLink("+5491155551234", "hola ✿")).toBe("https://wa.me/5491155551234?text=hola%20%E2%9C%BF");
  });

  it("lista de preparación agrupada por modelo y talle", () => {
    const rows = pickingList([
      { number: "MG-1", items: [item("maddie", "4"), item("elsa", "2")] },
      { number: "MG-2", items: [item("maddie", "4", 2)] },
    ]);
    expect(rows.map((r) => [r.name, r.size, r.qty, r.orders.join(",")])).toEqual([
      ["Set Maddie", "4", 3, "MG-1,MG-2"],
      ["Vestido Elsa", "2", 1, "MG-1"],
    ]);
    expect(toPrepare([{ status: "nuevo" }, { status: "listo" }, { status: "preparando" }])).toHaveLength(2);
  });
});

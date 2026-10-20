import { describe, expect, it } from "vitest";
import { type MailOrder, messageMail, paymentApprovedMail, paymentReminderMail } from "./mail";

const links = {
  tracking: "http://web/seguimiento?pedido=MG-1001",
  whatsapp: "https://wa.me/549",
  site: "http://web",
  workshop: "Villa Crespo",
  exchangeDays: 15,
};

const order = (over: Partial<MailOrder> = {}): MailOrder => ({
  number: "MG-1001",
  firstName: "Lucía",
  email: "lucia@gmail.com",
  items: [
    { name: "Set Maddie Bordado", size: "4", qty: 2, unitPriceCents: 39_000_00, imageUrl: "http://api/media/m.webp" },
  ],
  subtotalCents: 78_000_00,
  discountCents: 7_800_00,
  shippingCents: 5_900_00,
  totalCents: 76_100_00,
  couponCode: "OTONO10",
  shippingMethod: "domicilio",
  shippingAddress: "Gurruchaga 1234, 3° B · CABA (1414)",
  pickupLabel: null,
  paymentMethod: "credito",
  installments: 3,
  ...over,
});

describe("paymentApprovedMail", () => {
  it("arma asunto, destinatario y el detalle del pedido", () => {
    const m = paymentApprovedMail(order(), links);
    expect(m.to).toBe("lucia@gmail.com");
    expect(m.subject).toBe("Recibimos tu pago · Pedido #MG-1001");
    for (const s of ["Set Maddie Bordado", "Talle 4", "$78.000", "-$7.800", "Cupón OTONO10", "$5.900", "$76.100"])
      expect(m.html).toContain(s);
    expect(m.text).toContain("Tarjeta de crédito en 3 cuotas");
    expect(m.text).toContain("Gurruchaga 1234");
    expect(m.html).toContain(links.tracking);
    expect(m.html).toContain("15 días para cambiar el talle");
  });

  it("retiro en el taller con su horario y envío gratis", () => {
    const m = paymentApprovedMail(
      order({
        shippingMethod: "taller",
        pickupLabel: "Jue 8 · 10 a 13 h",
        shippingCents: 0,
        discountCents: 0,
        couponCode: null,
      }),
      links,
    );
    expect(m.text).toContain("Retirás en el taller (Villa Crespo) el Jue 8 · 10 a 13 h.");
    expect(m.text).toContain("Retiro en el taller: Sin costo");
    expect(m.text).not.toContain("Envío:");
    expect(m.html).not.toContain("Cupón");
  });

  it("venta en el taller cobrada en efectivo: se la llevó, sin entrega ni seguimiento", () => {
    const m = paymentApprovedMail(
      order({ shippingMethod: "taller", inPerson: true, shippingCents: 0, paymentMethod: "efectivo", installments: 1 }),
      links,
      "Gaby ya recibió tu pedido y lo prepara en el taller.",
    );
    expect(m.text).toContain("Gracias por pasar por el taller. Te lo llevaste del taller en el momento.");
    expect(m.text).toContain("pagado con Efectivo, en el taller");
    expect(m.text).not.toContain("prepara");
    expect(m.text).not.toContain("Retiro en el taller");
    expect(m.html).not.toContain(links.tracking);
  });

  it("escapa lo que escribió el cliente", () => {
    const m = paymentApprovedMail(order({ firstName: "<script>x</script>" }), links);
    expect(m.html).not.toContain("<script>x");
    expect(m.html).toContain("&lt;script&gt;");
  });
});

describe("recordatorio de link de pago", () => {
  it("lleva el link para pagar, el total y hasta cuándo se guardan las prendas", () => {
    const m = paymentReminderMail(
      {
        number: "MG-1046",
        firstName: "Paula",
        email: "paula@gmail.com",
        totalCents: 36_900_00,
        payUrl: "http://web/pagar/MG-1046?t=abc&x=1",
        reservedUntilLabel: "jueves 16 de octubre, 22 h",
      },
      links,
    );
    expect(m.to).toBe("paula@gmail.com");
    expect(m.subject).toBe("Tu pedido #MG-1046 te espera");
    expect(m.html).toContain('href="http://web/pagar/MG-1046?t=abc&amp;x=1"');
    expect(m.text).toContain("$36.900");
    expect(m.text).toContain("hasta el jueves 16 de octubre, 22 h");
  });

  it("aviso con prendas sugeridas (cumple): fotos, precio y link, también en texto plano; sin número de pedido", () => {
    const m = messageMail(
      {
        to: "lucia@gmail.com",
        subject: "Se viene el cumple de Olivia ♡",
        eyebrow: "Faltan 15 días · cumple de Olivia",
        name: null,
        body: "Hola Lucía! Se viene el cumple de Olivia.",
        cta: { label: "Ver todo en talle 6", url: "http://web/catalogo?talle=6" },
        number: null,
        products: [
          {
            name: "Vestido Elsa",
            priceCents: 28_000_00,
            imageUrl: "http://api/media/e.webp",
            url: "http://web/producto/elsa",
          },
        ],
      },
      links,
    );
    expect(m.html).toContain('src="http://api/media/e.webp"');
    expect(m.html).toContain('href="http://web/producto/elsa"');
    expect(m.html).not.toContain("con el número");
    expect(m.text).toContain("- Vestido Elsa · $28.000: http://web/producto/elsa");
  });
});

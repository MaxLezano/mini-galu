import { describe, expect, it } from "vitest";
import { type MailOrder, paymentApprovedMail } from "./mail";

const links = {
  tracking: "http://web/seguimiento?pedido=MG-1001",
  whatsapp: "https://wa.me/549",
  site: "http://web",
  workshop: "Villa Crespo",
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
    expect(m.text).toContain("Envío: Gratis");
    expect(m.html).not.toContain("Cupón");
  });

  it("escapa lo que escribió el cliente", () => {
    const m = paymentApprovedMail(order({ firstName: "<script>x</script>" }), links);
    expect(m.html).not.toContain("<script>x");
    expect(m.html).toContain("&lt;script&gt;");
  });
});

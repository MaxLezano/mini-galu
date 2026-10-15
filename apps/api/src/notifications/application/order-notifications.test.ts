import { describe, expect, it } from "vitest";
import type { MailOrder } from "../domain/mail";
import { MemoryMailer } from "../testing/in-memory";
import { OrderNotifications } from "./order-notifications";

const order: MailOrder = {
  number: "MG-1001",
  firstName: "Lucía",
  email: "lucia@gmail.com",
  items: [],
  subtotalCents: 1,
  discountCents: 0,
  shippingCents: 0,
  totalCents: 1,
  couponCode: null,
  shippingMethod: "taller",
  shippingAddress: null,
  pickupLabel: null,
  paymentMethod: "debito",
  installments: 1,
};

describe("OrderNotifications", () => {
  it("manda 'Recibimos tu pago' al email del pedido con el link de seguimiento", async () => {
    const mailer = new MemoryMailer();
    const n = new OrderNotifications({ find: async (id) => (id === "o1" ? order : null) }, mailer, async (num) => ({
      tracking: `http://web/seguimiento?pedido=${num}`,
      whatsapp: "w",
      site: "s",
      workshop: "Villa Crespo",
      exchangeDays: 30,
    }));
    expect(await n.paymentApproved("o1")).toBe("lucia@gmail.com");
    expect(await n.paymentApproved("no-existe")).toBeNull();
    expect(mailer.sent).toHaveLength(1);
    expect(mailer.sent[0]).toMatchObject({ to: "lucia@gmail.com", subject: "Recibimos tu pago · Pedido #MG-1001" });
    expect(mailer.sent[0]?.html).toContain("http://web/seguimiento?pedido=MG-1001");
  });
});

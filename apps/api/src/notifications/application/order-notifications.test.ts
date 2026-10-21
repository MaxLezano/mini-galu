import { describe, expect, it } from "vitest";
import type { MailOrder } from "../domain/mail";
import { MemoryMailer } from "../testing/in-memory";
import { OrderNotifications } from "./order-notifications";

const order: MailOrder = {
  number: "MG-1001",
  accessToken: "tok",
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
  it("manda 'Recibimos tu pago' al email del pedido con el link de seguimiento (con el token)", async () => {
    const mailer = new MemoryMailer();
    const n = new OrderNotifications({ find: async (id) => (id === "o1" ? order : null) }, mailer, async (num, t) => ({
      tracking: `http://web/seguimiento?pedido=${num}&t=${t}`,
      whatsapp: "w",
      site: "s",
      workshop: "Villa Crespo",
      exchangeDays: 30,
    }));
    expect(await n.paymentApproved("o1")).toBe("lucia@gmail.com");
    expect(await n.paymentApproved("no-existe")).toBeNull();
    expect(mailer.sent).toHaveLength(1);
    expect(mailer.sent[0]).toMatchObject({ to: "lucia@gmail.com", subject: "Recibimos tu pago · Pedido #MG-1001" });
    expect(mailer.sent[0]?.text).toContain("http://web/seguimiento?pedido=MG-1001&t=tok");
  });

  it("adjunta la factura si ya se emitió", async () => {
    const mailer = new MemoryMailer();
    const pdf = { filename: "factura-C-00003-00000042.pdf", content: new Uint8Array([37, 80, 68, 70]) };
    const links = async () => ({ tracking: "t", whatsapp: "w", site: "s", workshop: "w", exchangeDays: 2 });
    const n = new OrderNotifications({ find: async () => order }, mailer, links, async (id) =>
      id === "o1" ? pdf : null,
    );
    await n.paymentApproved("o1");
    await n.paymentApproved("o2");
    expect(mailer.sent[0]?.attachments).toEqual([pdf]);
    expect(mailer.sent[1]?.attachments).toBeUndefined();
  });
});

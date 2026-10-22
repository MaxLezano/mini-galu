import { describe, expect, it, vi } from "vitest";
import { CloudWhatsApp, FakeWhatsApp, templateText } from "./whatsapp-cloud";

const config = {
  token: "EAAG",
  phoneNumberId: "1234567890",
  templates: { pedido: "aviso_pedido", novedad: "aviso_novedad" },
  language: "es_AR",
};
const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });

describe("CloudWhatsApp", () => {
  it("manda la plantilla del pedido con el número y el mensaje de la regla", async () => {
    const f = vi.fn<typeof fetch>().mockResolvedValue(reply(200, { messages: [{ id: "wamid.1" }] }));
    await new CloudWhatsApp(config, f).send({
      to: "+5491155551234",
      kind: "pedido",
      number: "MG-1042",
      body: "Hola Lucía!\n\nTu pedido ya salió.",
    });
    const [url, init] = f.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://graph.facebook.com/v26.0/1234567890/messages");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer EAAG");
    expect(JSON.parse(init.body as string)).toEqual({
      messaging_product: "whatsapp",
      to: "5491155551234",
      type: "template",
      template: {
        name: "aviso_pedido",
        language: { code: "es_AR" },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: "MG-1042" },
              { type: "text", text: "Hola Lucía! Tu pedido ya salió." },
            ],
          },
        ],
      },
    });
  });

  it("la novedad va con su plantilla y una sola variable", async () => {
    const f = vi.fn<typeof fetch>().mockResolvedValue(reply(200, {}));
    await new CloudWhatsApp(config, f).send({ to: "+5491155551234", kind: "novedad", body: "Volvió el talle 6" });
    const [, init] = f.mock.calls[0] as [string, RequestInit];
    const sent = JSON.parse(init.body as string);
    expect(sent.template.name).toBe("aviso_novedad");
    expect(sent.template.components[0].parameters).toEqual([{ type: "text", text: "Volvió el talle 6" }]);
  });

  it("si Meta no lo acepta, falla con su código y el detalle", async () => {
    const f = vi.fn<typeof fetch>().mockResolvedValue(
      reply(400, {
        error: {
          message: "(#132001) Template name does not exist in the translation",
          code: 132001,
          error_data: { details: "template name (aviso_pedido) does not exist in es_AR" },
        },
      }),
    );
    await expect(
      new CloudWhatsApp(config, f).send({ to: "+5491155551234", kind: "novedad", body: "x" }),
    ).rejects.toThrow("(#132001) template name (aviso_pedido) does not exist in es_AR");
  });

  it("sin saltos de línea ni espacios de más dentro de la variable", () => {
    expect(templateText("  Hola!\n\nTe\tesperamos     el jueves ")).toBe("Hola! Te esperamos el jueves");
  });
});

describe("FakeWhatsApp", () => {
  it("lo deja en Mailpit a nombre del número", async () => {
    const send = vi.fn();
    await new FakeWhatsApp({ send }).send({ to: "+5491155551234", kind: "pedido", number: "MG-1", body: "Hola <b>" });
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "5491155551234@whatsapp.simulado",
        subject: "WhatsApp (simulado) · pedido #MG-1",
        text: "Hola <b>",
        html: expect.stringContaining("Hola &lt;b&gt;"),
      }),
    );
  });
});

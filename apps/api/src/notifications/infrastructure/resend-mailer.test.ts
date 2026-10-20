import { afterEach, describe, expect, it, vi } from "vitest";
import { ResendMailer } from "./resend-mailer";

const mail = { to: "ana@mail.com", subject: "Recibimos tu pago", html: "<p>Hola</p>", text: "Hola" };
const waits: number[] = [];
const resend = new ResendMailer({ apiKey: "re_clave", from: "Mini Galú <hola@minigalu.com.ar>" }, async (ms) => {
  waits.push(ms);
});

const reply = (status: number, body: unknown = {}, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers });

afterEach(() => {
  vi.restoreAllMocks();
  waits.length = 0;
});

describe("ResendMailer", () => {
  it("manda el mail a la API con la clave y el remitente", async () => {
    const f = vi.spyOn(globalThis, "fetch").mockResolvedValue(reply(200, { id: "e1" }));
    await resend.send(mail);
    const [url, init] = f.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer re_clave");
    expect(JSON.parse(init.body as string)).toEqual({
      from: "Mini Galú <hola@minigalu.com.ar>",
      to: ["ana@mail.com"],
      subject: "Recibimos tu pago",
      html: "<p>Hola</p>",
      text: "Hola",
    });
  });

  it("si el mail tiene a dónde responder, lo manda como reply_to", async () => {
    const f = vi.spyOn(globalThis, "fetch").mockResolvedValue(reply(200, { id: "e1" }));
    await resend.send({ ...mail, replyTo: "mini.galu.store@gmail.com" });
    const [, init] = f.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string).reply_to).toBe("mini.galu.store@gmail.com");
  });

  it("si se pasa del límite por segundo espera lo que pide Resend y reintenta", async () => {
    const f = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(reply(429, { message: "Too many requests" }, { "retry-after": "2" }))
      .mockResolvedValueOnce(reply(200, { id: "e1" }));
    await resend.send(mail);
    expect(f).toHaveBeenCalledTimes(2);
    expect(waits).toEqual([2000]);
  });

  it("ante fallas de Resend reintenta y, si siguen, avisa con el error", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => reply(503, { message: "Service unavailable" }));
    await expect(resend.send(mail)).rejects.toThrow("Resend 503: Service unavailable");
    expect(waits).toEqual([1000, 2000]);
  });

  it("un error de datos (dominio sin verificar, mail inválido) no se reintenta", async () => {
    const f = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(reply(403, { message: "The minigalu.com.ar domain is not verified." }));
    await expect(resend.send(mail)).rejects.toThrow("Resend 403: The minigalu.com.ar domain is not verified.");
    expect(f).toHaveBeenCalledTimes(1);
  });
});

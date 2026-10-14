import { beforeEach, describe, expect, it } from "vitest";
import { NotFoundError } from "../../shared/domain/errors";
import { MemoryLetterMailer, MemoryLetters, MemorySubscribers } from "../testing/in-memory";
import { NewsletterService } from "./newsletter-service";

let subs: MemorySubscribers;
let letters: MemoryLetters;
let mailer: MemoryLetterMailer;
let svc: NewsletterService;
let k = 0;

beforeEach(() => {
  subs = new MemorySubscribers();
  letters = new MemoryLetters();
  mailer = new MemoryLetterMailer();
  svc = new NewsletterService(
    subs,
    letters,
    mailer,
    (t) => `http://web/cartas/baja?t=${t}`,
    undefined,
    () => `tok${k++}`,
  );
});

describe("Cartas del taller", () => {
  it("suscribirse manda la bienvenida una vez; darse de baja y volver a sumarse", async () => {
    await svc.subscribe("lucia@gmail.com", "footer");
    await svc.subscribe("lucia@gmail.com", "footer");
    expect(mailer.sent).toHaveLength(1);
    expect(mailer.sent[0]?.unsubscribeUrl).toMatch(/^http:\/\/web\/cartas\/baja\?t=tok/);
    const token = subs.list[0]?.token ?? "";
    await svc.unsubscribe(token);
    expect((await svc.admin()).subscribers).toBe(0);
    await svc.subscribe("lucia@gmail.com", "footer");
    expect((await svc.admin()).subscribers).toBe(1);
    await expect(svc.unsubscribe("no-existe")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("la carta sale a los suscriptos activos, cada uno con su link de baja, y queda registrada", async () => {
    await svc.subscribe("a@gmail.com", "footer");
    await svc.subscribe("b@gmail.com", "cuenta");
    await svc.unsubscribe(subs.list[1]?.token ?? "");
    mailer.sent = [];
    const r = await svc.send({ subject: "Llega el otoño", body: "Hola! Les cuento lo que viene." }, true);
    expect(r.recipients).toBe(1);
    expect(mailer.sent).toEqual([
      expect.objectContaining({ kind: "letter", to: "a@gmail.com", subject: "Llega el otoño" }),
    ]);
    const a = await svc.admin();
    expect(a.letters[0]).toMatchObject({ subject: "Llega el otoño", recipients: 1 });
    expect(a.letters[0]?.sentAt).not.toBeNull();
    expect(await svc.csv()).toMatch(/^email,desde\na@gmail\.com,\d{4}-\d{2}-\d{2}$/);
  });
});

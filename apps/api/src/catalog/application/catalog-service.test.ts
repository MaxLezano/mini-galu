import { CatalogQuerySchema } from "@mini-galu/contracts";
import { beforeEach, describe, expect, it } from "vitest";
import { NotFoundError, ValidationError } from "../../shared/domain/errors";
import { LocalDiskImageStorage } from "../../shared/media/image-storage";
import { makeProduct } from "../testing/fixtures";
import { InMemoryProductRepository, InMemoryWaitlistRepository } from "../testing/in-memory";
import { CatalogService } from "./catalog-service";

const samanta = makeProduct({
  slug: "samanta",
  variants: [
    { size: "6", stock: 0, measures: null },
    { size: "8", stock: 3, measures: null },
  ],
});
const pana = makeProduct({
  slug: "corazon-pana",
  status: "draft",
  variants: [{ size: "4", stock: 0, measures: null }],
});

let service: CatalogService;
let waitlist: InMemoryWaitlistRepository;

beforeEach(() => {
  waitlist = new InMemoryWaitlistRepository();
  service = new CatalogService(
    new InMemoryProductRepository([samanta, pana]),
    waitlist,
    new LocalDiskImageStorage("http://api"),
  );
});

describe("CatalogService", () => {
  it("no lista borradores y arma URLs públicas de imágenes", async () => {
    const list = await service.list(CatalogQuerySchema.parse({ instock: "0" }));
    expect(list.map((p) => p.slug)).toEqual(["samanta"]);
    expect(list[0]?.images[0]?.url).toMatch(/^http:\/\/api\/media\/products\//);
  });

  it("la ficha de un borrador se puede ver (lanzamiento)", async () => {
    expect((await service.detail("corazon-pana")).status).toBe("draft");
    await expect(service.detail("no-existe")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("anota en la lista de espera solo talles agotados, en orden e idempotente", async () => {
    const wa = { slug: "samanta", size: "6", channel: "whatsapp", contact: "11 5555-1234" } as const;
    expect(await service.joinWaitlist(wa)).toEqual({ created: true, position: 1 });
    expect(await service.joinWaitlist(wa)).toEqual({ created: false, position: 1 });
    expect(await service.joinWaitlist({ ...wa, contact: "11 4444-0000" })).toEqual({ created: true, position: 2 });
    await expect(service.joinWaitlist({ ...wa, size: "8" })).rejects.toBeInstanceOf(ValidationError);
    await expect(service.joinWaitlist({ ...wa, size: "10" })).rejects.toBeInstanceOf(ValidationError);
  });

  it("en un borrador se anota al modelo sin talle", async () => {
    const r = await service.joinWaitlist({ slug: "corazon-pana", size: null, channel: "email", contact: "a@b.com" });
    expect(r.created).toBe(true);
    await expect(
      service.joinWaitlist({ slug: "samanta", size: null, channel: "email", contact: "a@b.com" }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

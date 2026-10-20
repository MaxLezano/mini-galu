import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Hono } from "hono";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { coverBox } from "./image-cropper";
import { LocalDiskImageStorage } from "./image-storage";
import { mediaVariantsOnDemand } from "./media-variants";
import { type ImageResizer, ResponsiveImageStorage, variantPath } from "./responsive-image-storage";
import { SharpCropper, SharpResizer } from "./sharp-resizer";

const fakeResizer: ImageResizer = { resize: async (_b, w, f) => new TextEncoder().encode(`${w}.${f}`) };
const photo = (width: number) =>
  sharp({ create: { width, height: Math.round(width * 1.25), channels: 3, background: "#c9a27e" } })
    .jpeg()
    .toBuffer();

describe("ResponsiveImageStorage", () => {
  it("guarda el original y sus variantes AVIF y WebP en todos los anchos", async () => {
    const saved = new Map<string, string>();
    const inner = {
      url: (p: string) => `http://api/media/${p}`,
      save: async (p: string, b: Uint8Array) => {
        saved.set(p, new TextDecoder().decode(b));
        return p;
      },
    };
    const storage = new ResponsiveImageStorage(inner, fakeResizer);

    expect(await storage.save("products/a.jpg", new TextEncoder().encode("orig"))).toBe("products/a.jpg");
    expect(saved.get("products/a.jpg")).toBe("orig");
    expect(saved.get("products/a@640.avif")).toBe("640.avif");
    expect(saved.get("products/a@1920.webp")).toBe("1920.webp");
    expect(saved.size).toBe(11);
  });

  it("nombra las variantes como contracts", () => {
    expect(variantPath("content/hero-campo.webp", 320, "webp")).toBe("content/hero-campo@320.webp");
  });
});

describe("coverBox", () => {
  it("da el rectángulo 3:4 más grande que entra, o null si ya es 3:4", () => {
    expect(coverBox(1200, 1200, 3 / 4)).toEqual({ width: 900, height: 1200 });
    expect(coverBox(900, 1600, 3 / 4)).toEqual({ width: 900, height: 1200 });
    expect(coverBox(4000, 3000, 3 / 4)).toEqual({ width: 2250, height: 3000 });
    expect(coverBox(900, 1200, 3 / 4)).toBeNull();
    expect(coverBox(901, 1200, 3 / 4)).toBeNull();
  });
});

describe("SharpCropper", () => {
  const image = (width: number, height: number) =>
    sharp({ create: { width, height, channels: 3, background: "#c9a27e" } });

  it("recorta a 3:4 y deja el formato", async () => {
    const cropper = new SharpCropper();
    const square = await sharp(await cropper.crop(await image(800, 800).jpeg().toBuffer(), 3 / 4)).metadata();
    expect([square.format, square.width, square.height]).toEqual(["jpeg", 600, 800]);
    const tall = await sharp(await cropper.crop(await image(600, 1200).webp().toBuffer(), 3 / 4)).metadata();
    expect([tall.format, tall.width, tall.height]).toEqual(["webp", 600, 800]);
  });

  it("la que ya es 3:4 (o sin proporción) queda del mismo tamaño y formato, pero sin el GPS del celular", async () => {
    const gps = { IFD3: { GPSLatitudeRef: "S", GPSLatitude: "26/1 49/1 0/1" } };
    const bytes = new Uint8Array(await image(600, 800).withExifMerge(gps).jpeg().toBuffer());
    expect((await sharp(bytes).metadata()).exif).toBeDefined();
    for (const aspect of [3 / 4, null]) {
      const out = await sharp(await new SharpCropper().crop(bytes, aspect)).metadata();
      expect([out.format, out.width, out.height, out.exif]).toEqual(["jpeg", 600, 800, undefined]);
    }
  });

  it("mide la foto ya girada según el EXIF del celular", async () => {
    // guardada apaisada 1200×900 con orientación 6: se ve vertical 900×1200, que ya es 3:4
    const bytes = new Uint8Array(await image(1200, 900).withMetadata({ orientation: 6 }).jpeg().toBuffer());
    const kept = await sharp(await new SharpCropper().crop(bytes, 3 / 4)).metadata();
    expect([kept.width, kept.height, kept.orientation]).toEqual([900, 1200, undefined]);
    const rotated = await image(1600, 900).withMetadata({ orientation: 6 }).jpeg().toBuffer();
    const out = await sharp(await new SharpCropper().crop(rotated, 3 / 4)).metadata();
    expect([out.width, out.height, out.orientation]).toEqual([900, 1200, undefined]);
  });
});

describe("SharpResizer", () => {
  it("achica sin agrandar y codifica en el formato pedido", async () => {
    const resizer = new SharpResizer();
    const big = await sharp(await resizer.resize(await photo(1200), 640, "avif")).metadata();
    expect([big.format, big.width]).toEqual(["heif", 640]);
    const small = await sharp(await resizer.resize(await photo(300), 960, "webp")).metadata();
    expect([small.format, small.width]).toEqual(["webp", 300]);
  });
});

describe("variantes bajo demanda", () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "media-"));
  });
  afterEach(() => rm(dir, { recursive: true, force: true }));

  const app = () => {
    const disk = new LocalDiskImageStorage("http://api", dir);
    return new Hono().use("/media/*", mediaVariantsOnDemand(dir, disk, fakeResizer)).get("/media/*", async (c) => {
      const file = join(dir, c.req.path.replace(/^\/media\//, ""));
      return readFile(file).then(
        (b) => c.text(b.toString()),
        () => c.notFound(),
      );
    });
  };

  it("genera la variante que falta desde el original y la deja guardada", async () => {
    await new LocalDiskImageStorage("http://api", dir).save("products/a.webp", new Uint8Array([1]));
    const res = await app().request("/media/products/a@640.avif");
    expect(await res.text()).toBe("640.avif");
    expect((await readFile(join(dir, "products/a@640.avif"))).toString()).toBe("640.avif");
  });

  it("no toca lo que ya existe, los anchos inválidos ni las fotos sin original", async () => {
    await new LocalDiskImageStorage("http://api", dir).save("products/a@320.webp", new TextEncoder().encode("ya"));
    expect(await (await app().request("/media/products/a@320.webp")).text()).toBe("ya");
    await writeFile(join(dir, "b.webp"), "x");
    expect((await app().request("/media/b@500.webp")).status).toBe(404);
    expect((await app().request("/media/nada@640.webp")).status).toBe(404);
  });
});

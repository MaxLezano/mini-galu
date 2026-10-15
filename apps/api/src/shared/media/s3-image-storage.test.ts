import { describe, expect, it } from "vitest";
import { S3ImageStorage } from "./s3-image-storage";
import { signV4 } from "./sigv4";

describe("signV4", () => {
  it("firma igual que el ejemplo de la documentación de S3 (GET Object)", () => {
    const authorization = signV4(
      {
        accessKeyId: "AKIAIOSFODNN7EXAMPLE",
        secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
        region: "us-east-1",
        service: "s3",
      },
      {
        method: "GET",
        url: new URL("https://examplebucket.s3.amazonaws.com/test.txt"),
        headers: {
          range: "bytes=0-9",
          "x-amz-content-sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
          "x-amz-date": "20130524T000000Z",
        },
      },
    );
    expect(authorization).toBe(
      "AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE/20130524/us-east-1/s3/aws4_request, " +
        "SignedHeaders=host;range;x-amz-content-sha256;x-amz-date, " +
        "Signature=f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41",
    );
  });
});

const cfg = {
  endpoint: "https://cuenta.r2.cloudflarestorage.com",
  bucket: "fotos",
  region: "auto",
  accessKeyId: "id",
  secretAccessKey: "secreto",
  publicUrl: "https://fotos.minigalu.com.ar/",
};

function fakeBucket(statuses: number[] = []) {
  const calls: { url: string; init: RequestInit }[] = [];
  const http = (async (url: URL, init: RequestInit) => {
    calls.push({ url: url.toString(), init });
    return new Response(statuses.length ? "error" : null, { status: statuses.shift() ?? 200 });
  }) as unknown as typeof fetch;
  return { calls, http };
}

describe("S3ImageStorage", () => {
  it("sube la foto firmada al bucket, con tipo y cache para siempre", async () => {
    const { calls, http } = fakeBucket();
    const storage = new S3ImageStorage(cfg, http, () => new Date("2026-10-15T12:00:00Z"));

    expect(await storage.save("/products/a@640.avif", new Uint8Array([1, 2, 3]))).toBe("products/a@640.avif");
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://cuenta.r2.cloudflarestorage.com/fotos/products/a%40640.avif");
    const headers = calls[0]?.init.headers as Record<string, string>;
    expect(calls[0]?.init.method).toBe("PUT");
    expect(headers["content-type"]).toBe("image/avif");
    expect(headers["cache-control"]).toContain("immutable");
    expect(headers["x-amz-date"]).toBe("20261015T120000Z");
    expect(headers.authorization).toMatch(/^AWS4-HMAC-SHA256 Credential=id\/20261015\/auto\/s3\/aws4_request, /);
  });

  it("arma la URL pública desde el dominio del bucket", () => {
    const storage = new S3ImageStorage(cfg);
    expect(storage.url("content/hero-campo@320.webp")).toBe(
      "https://fotos.minigalu.com.ar/content/hero-campo%40320.webp",
    );
  });

  it("reintenta las fallas del bucket y no los errores de credenciales", async () => {
    const flaky = fakeBucket([503]);
    await new S3ImageStorage(cfg, flaky.http).save("a.webp", new Uint8Array());
    expect(flaky.calls).toHaveLength(2);

    const denied = fakeBucket([403]);
    await expect(new S3ImageStorage(cfg, denied.http).save("a.webp", new Uint8Array())).rejects.toThrow("Bucket 403");
    expect(denied.calls).toHaveLength(1);
  });

  it("rechaza rutas que salen del bucket", async () => {
    const { http } = fakeBucket();
    await expect(new S3ImageStorage(cfg, http).save("../a.webp", new Uint8Array())).rejects.toThrow("inválida");
  });
});

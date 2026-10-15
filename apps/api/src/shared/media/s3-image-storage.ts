import type { ImageStorage } from "./image-storage";
import { amzDate, sha256Hex, signV4 } from "./sigv4";

export type S3StorageConfig = {
  /** Endpoint S3 del proveedor (R2: https://<cuenta>.r2.cloudflarestorage.com). */
  endpoint: string;
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** Dominio público del bucket (R2: dominio propio o r2.dev); de acá salen las URLs de las fotos. */
  publicUrl: string;
};

const CONTENT_TYPES: Record<string, string> = {
  avif: "image/avif",
  webp: "image/webp",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
};
const ATTEMPTS = 3;

/** RFC 3986 por segmento, como lo canoniza S3 ("products/a@640.avif" → "products/a%40640.avif"). */
const encodeKey = (path: string) =>
  path
    .split("/")
    .map((s) => encodeURIComponent(s).replace(/[!'()*]/g, (ch) => `%${ch.charCodeAt(0).toString(16).toUpperCase()}`))
    .join("/");

/** Fotos en un bucket S3 (Cloudflare R2 en producción): se suben firmadas y se sirven desde su dominio público. */
export class S3ImageStorage implements ImageStorage {
  constructor(
    private readonly cfg: S3StorageConfig,
    private readonly http: typeof fetch = fetch,
    private readonly now = () => new Date(),
  ) {}

  url(path: string): string {
    return `${this.cfg.publicUrl.replace(/\/$/, "")}/${encodeKey(path.replace(/^\//, ""))}`;
  }

  async save(path: string, bytes: Uint8Array): Promise<string> {
    const clean = path.replace(/\\/g, "/").replace(/^\/+/, "");
    if (!clean || clean.includes("..")) throw new Error("Ruta de imagen inválida");
    const url = new URL(`${this.cfg.endpoint.replace(/\/$/, "")}/${this.cfg.bucket}/${encodeKey(clean)}`);
    const ext = clean.split(".").pop()?.toLowerCase() ?? "";
    const payloadHash = sha256Hex(bytes);
    for (let attempt = 1; ; attempt++) {
      const headers: Record<string, string> = {
        "content-type": CONTENT_TYPES[ext] ?? "application/octet-stream",
        // las subidas llevan nombre nuevo (UUID): una URL nunca cambia de contenido
        "cache-control": "public, max-age=31536000, immutable",
        "x-amz-content-sha256": payloadHash,
        "x-amz-date": amzDate(this.now()),
      };
      const authorization = signV4({ ...this.cfg, service: "s3" }, { method: "PUT", url, headers });
      const res = await this.http(url, { method: "PUT", headers: { ...headers, authorization }, body: bytes });
      if (res.ok) return clean;
      if (res.status < 500 || attempt === ATTEMPTS)
        throw new Error(`Bucket ${res.status} al subir ${clean}: ${(await res.text().catch(() => "")).slice(0, 300)}`);
    }
  }
}

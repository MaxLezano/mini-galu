import { randomUUID } from "node:crypto";
import { mkdir, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

/** Puerto de imágenes. Local: disco (apps/api/storage/media). Prod: Cloudinary o R2 (PLAN §3). */
export interface ImageStorage {
  /** URL pública de una ruta guardada (ej. "products/maddie-1.webp"); sus variantes siguen `imageVariant` (contracts). */
  url(path: string): string;
  /** Guarda el archivo y devuelve su ruta relativa (la que se guarda en la base). */
  save(path: string, bytes: Uint8Array): Promise<string>;
}

export class LocalDiskImageStorage implements ImageStorage {
  constructor(
    private readonly publicBaseUrl: string,
    private readonly dir = "",
  ) {}

  url(path: string): string {
    return `${this.publicBaseUrl.replace(/\/$/, "")}/media/${path.replace(/^\//, "")}`;
  }

  async save(path: string, bytes: Uint8Array): Promise<string> {
    const clean = path.replace(/\\/g, "/").replace(/^\/+/, "");
    if (!this.dir || clean.includes("..")) throw new Error("Ruta de imagen inválida");
    const file = resolve(this.dir, clean);
    await mkdir(dirname(file), { recursive: true });
    // se escribe aparte y se renombra: nadie lee una foto a medio escribir
    const tmp = `${file}.${randomUUID()}.tmp`;
    await writeFile(tmp, bytes);
    await rename(tmp, file);
    return clean;
  }
}

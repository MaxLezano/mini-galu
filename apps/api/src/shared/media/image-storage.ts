/** Puerto de imágenes. Local: disco (apps/api/storage/media). Prod: Cloudinary o R2 (PLAN §3). */
export interface ImageStorage {
  /** URL pública de una ruta guardada (ej. "products/maddie-1.webp"). */
  url(path: string): string;
}

export class LocalDiskImageStorage implements ImageStorage {
  constructor(private readonly publicBaseUrl: string) {}

  url(path: string): string {
    return `${this.publicBaseUrl.replace(/\/$/, "")}/media/${path.replace(/^\//, "")}`;
  }
}

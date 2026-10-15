import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseImageVariant } from "@mini-galu/contracts";
import type { MiddlewareHandler } from "hono";
import type { ImageStorage } from "./image-storage";
import type { ImageResizer } from "./responsive-image-storage";

const ORIGINAL_EXTS = ["webp", "jpg", "jpeg", "png", "avif"];
const exists = (file: string) =>
  access(file).then(
    () => true,
    () => false,
  );

/**
 * Variantes bajo demanda en el disco local: las fotos que no pasaron por el panel (las del seed, las subidas antes
 * de que existieran las variantes) las generan la primera vez que se piden y quedan guardadas.
 */
export function mediaVariantsOnDemand(dir: string, storage: ImageStorage, resizer: ImageResizer): MiddlewareHandler {
  const pending = new Map<string, Promise<void>>();

  async function generate(path: string, { base, width, format }: NonNullable<ReturnType<typeof parseImageVariant>>) {
    for (const ext of ORIGINAL_EXTS) {
      const original = resolve(dir, `${base}.${ext}`);
      if (!(await exists(original))) continue;
      const bytes = await readFile(original);
      await storage.save(path, await resizer.resize(bytes, width, format));
      return;
    }
  }

  return async (c, next) => {
    const path = decodeURIComponent(c.req.path.replace(/^\/media\//, ""));
    const variant = parseImageVariant(path);
    if (variant && !path.includes("..") && !(await exists(resolve(dir, path)))) {
      // dos pedidos a la vez de la misma variante (srcset + preload) esperan la misma generación
      let job = pending.get(path);
      if (!job) {
        job = generate(path, variant).finally(() => pending.delete(path));
        pending.set(path, job);
      }
      await job.catch((e) => console.warn(`[media] no se pudo generar ${path}:`, e));
    }
    await next();
  };
}

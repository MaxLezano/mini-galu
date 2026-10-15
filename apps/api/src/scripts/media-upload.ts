/**
 * Sube al bucket (S3_* y MEDIA_PUBLIC_URL del .env) las fotos que están en el disco (MEDIA_DIR): las del seed y las
 * subidas antes de tener bucket, cada una con sus variantes AVIF/WebP. Las rutas no cambian, así que la base sirve igual.
 * Uso: pnpm --filter @mini-galu/api media:upload [carpeta…]   (ej. products content; sin nada, todas)
 */
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { parseImageVariant } from "@mini-galu/contracts";
import { loadConfig } from "../config";
import { ResponsiveImageStorage } from "../shared/media/responsive-image-storage";
import { S3ImageStorage } from "../shared/media/s3-image-storage";
import { SharpResizer } from "../shared/media/sharp-resizer";

const ORIGINAL = /\.(webp|jpe?g|png|avif)$/i;

async function originals(dir: string, root: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  const found = await Promise.all(
    entries.map(async (e) => {
      const file = join(dir, e.name);
      if (e.isDirectory()) return originals(file, root);
      const path = relative(root, file).replace(/\\/g, "/");
      return ORIGINAL.test(path) && !parseImageVariant(path) ? [path] : [];
    }),
  );
  return found.flat();
}

async function main() {
  const config = loadConfig();
  if (!config.s3) {
    console.log(
      "✗ Falta el bucket en el .env: S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY y MEDIA_PUBLIC_URL",
    );
    process.exitCode = 1;
    return;
  }
  const folders = process.argv.slice(2);
  const paths = (await originals(config.mediaDir, config.mediaDir)).filter(
    (p) => !folders.length || folders.some((f) => p.startsWith(`${f}/`)),
  );
  console.log(`${paths.length} fotos de ${config.mediaDir} → bucket ${config.s3.bucket}`);
  const storage = new ResponsiveImageStorage(new S3ImageStorage(config.s3), new SharpResizer());
  let failed = 0;
  for (const [i, path] of paths.entries()) {
    try {
      await storage.save(path, await readFile(join(config.mediaDir, path)));
      console.log(`✓ ${i + 1}/${paths.length} ${path}`);
    } catch (err) {
      failed++;
      console.log(`✗ ${path}: ${err instanceof Error ? err.message : err}`);
    }
  }
  if (failed < paths.length) console.log(`Listo. Se ven en ${storage.url(paths[0] as string)}`);
  if (failed) {
    console.log(`${failed} fotos no se subieron: volvé a correrlo (pisa las que ya están)`);
    process.exitCode = 1;
  }
}

main();

/**
 * Sirve los mockups (design/mockups) en http://localhost:5500.
 * Las fotos no están en el repo: /assets/img/* se lee de local-assets/mockups/img (ver local-assets/README.md).
 *
 *   pnpm mockups
 */
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const MOCKUPS = join(root, "design/mockups");
const IMAGES = join(root, "local-assets/mockups/img");
const PORT = 5500;
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".md": "text/plain; charset=utf-8",
};

createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url ?? "/", "http://x").pathname);
  const rel = normalize(path).replace(/^([/\\])+/, "");
  const [base, sub] = rel.startsWith(join("assets", "img"))
    ? [IMAGES, rel.slice(join("assets", "img").length)]
    : [MOCKUPS, rel];
  let file = join(base, sub);
  if (!file.startsWith(base)) return void res.writeHead(403).end();
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
  if (!existsSync(file)) return void res.writeHead(404).end("No encontrado");
  res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
  createReadStream(file).pipe(res);
}).listen(PORT, () => {
  console.log(`✓ Mockups en http://localhost:${PORT}`);
  if (!existsSync(IMAGES)) console.warn("⚠ Falta local-assets/mockups/img: los mockups se ven sin fotos");
});

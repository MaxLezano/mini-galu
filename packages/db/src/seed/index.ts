import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { inArray } from "drizzle-orm";
import { createDb } from "../client";
import { databaseUrl, repoRoot } from "../env";
import * as s from "../schema";
import { upsertAdmin } from "./admin";
import * as data from "./data";

/** Fotos de prueba: no están en el repo (ver local-assets/README.md). */
const SAMPLE_IMG = resolve(repoRoot(), "local-assets/mockups/img");
const MEDIA_DIR = resolve(repoRoot(), "apps/api", process.env.MEDIA_DIR ?? "./storage/media");
const missing: string[] = [];

/** Copia la foto al ImageStorage local (apps/api/storage/media). Si no está, igual guarda la ruta (CI, clon nuevo). */
function copyImage(name: string, folder: "products" | "content"): string {
  const from = resolve(SAMPLE_IMG, `${name}.webp`);
  if (existsSync(from)) {
    mkdirSync(resolve(MEDIA_DIR, folder), { recursive: true });
    copyFileSync(from, resolve(MEDIA_DIR, folder, `${name}.webp`));
  } else missing.push(name);
  return `${folder}/${name}.webp`;
}

const demoContact = (i: number) => `11 5${String(100 + i).padStart(3, "0")}-${String(1000 + i * 7).slice(-4)}`;

const db = createDb(databaseUrl(), { max: 1 });

await db.transaction(async (tx) => {
  // Idempotente: limpia lo sembrado (orden inverso por FKs).
  await tx.delete(s.launchSignups);
  await tx.delete(s.launchProducts);
  await tx.delete(s.launches);
  await tx.delete(s.contentBlocks);
  await tx.delete(s.reviews);
  await tx.delete(s.waitlistEntries);
  await tx.delete(s.variants);
  await tx.delete(s.productImages);
  await tx.delete(s.products);
  await tx.delete(s.collections);

  for (const name of data.contentImages) copyImage(name, "content");

  const cols = await tx
    .insert(s.collections)
    .values(
      data.collections.map((c, position) => ({
        slug: c.slug,
        name: c.name,
        label: c.label,
        tagline: c.tagline,
        coverPath: data.contentImages.includes(c.cover) ? `content/${c.cover}.webp` : `products/${c.cover}.webp`,
        position,
      })),
    )
    .returning({ id: s.collections.id, slug: s.collections.slug });
  const colId = new Map(cols.map((c) => [c.slug, c.id]));

  const now = Date.now();
  const productId = new Map<string, string>();
  for (const [i, p] of data.products.entries()) {
    const [row] = await tx
      .insert(s.products)
      .values({
        slug: p.slug,
        name: p.name,
        description: p.desc,
        collectionId: colId.get(p.col) ?? "",
        colorName: p.color[0],
        colorHex: p.color[1],
        fabric: p.fabric,
        care: data.CARE,
        occasions: p.occ,
        priceCents: p.price * 100,
        compareAtCents: p.was ? p.was * 100 : null,
        tag: p.tag ?? null,
        isAccessory: p.accessory ?? false,
        status: p.draft ? "draft" : "published",
        unitsSold: p.sold30,
        // el orden del mockup es "más nuevos primero"
        createdAt: new Date(now - i * 86_400_000),
      })
      .returning({ id: s.products.id });
    if (!row) throw new Error(`No se insertó ${p.slug}`);
    productId.set(p.slug, row.id);

    await tx.insert(s.productImages).values(
      p.photos.map((photo, position) => ({
        productId: row.id,
        path: copyImage(photo, data.contentImages.includes(photo) ? "content" : "products"),
        alt: position === 0 ? p.name : `${p.name}, foto ${position + 1}`,
        position,
      })),
    );

    await tx.insert(s.variants).values(
      Object.entries(p.sizes).map(([size, stock], position) => ({
        productId: row.id,
        size,
        stock,
        measures:
          p.measures?.[size as keyof typeof p.measures] ??
          data.DEFAULT_MEASURES[size as keyof typeof data.DEFAULT_MEASURES],
        position,
      })),
    );

    const waits = Object.entries(p.waitlist).flatMap(([size, n], sizeIdx) =>
      Array.from({ length: n }, (_, k) => ({
        productId: row.id,
        size,
        channel: "whatsapp" as const,
        contact: demoContact(i * 100 + sizeIdx * 10 + k),
      })),
    );
    if (waits.length) await tx.insert(s.waitlistEntries).values(waits);

    if (!p.draft) {
      await tx.insert(s.reviews).values(
        data.productReviews.map(([title, author, size, body], k) => ({
          productId: row.id,
          author,
          rating: 5,
          title,
          body,
          size: p.sizes[size] !== undefined ? size : (Object.keys(p.sizes)[0] ?? null),
          fit: "justo" as const,
          status: "publicada" as const,
          createdAt: new Date(now - (k + 3) * 7 * 86_400_000),
        })),
      );
    }
  }

  await tx.insert(s.reviews).values(
    data.featuredReviews.map(([author, city, slug, body, size], k) => ({
      productId: productId.get(slug) ?? "",
      author,
      city,
      rating: 5,
      title: "",
      body,
      size,
      fit: "justo" as const,
      status: "publicada" as const,
      featured: true,
      createdAt: new Date(now - k * 86_400_000),
    })),
  );

  const [l] = await tx
    .insert(s.launches)
    .values({
      title: data.launch.title,
      collectionId: colId.get(data.launch.collection),
      startsAt: new Date(data.launch.startsAt),
      teaser: data.launch.teaser,
      coverPath: `content/${data.launch.cover}.webp`,
      coverNote: data.launch.coverNote,
      socialText: data.launch.socialText,
      status: "scheduled",
    })
    .returning({ id: s.launches.id });
  if (!l) throw new Error("No se insertó el lanzamiento");
  const launchProductIds = data.launch.products.flatMap((slug) => productId.get(slug) ?? []);
  if (launchProductIds.length)
    await tx
      .insert(s.launchProducts)
      .values(launchProductIds.map((id, position) => ({ launchId: l.id, productId: id, position })));

  for (const o of data.otherLaunches) {
    const [ol] = await tx
      .insert(s.launches)
      .values({
        title: o.title,
        collectionId: o.collection ? colId.get(o.collection) : null,
        startsAt: new Date(o.startsAt),
        teaser: o.teaser,
        coverPath: o.cover,
        coverNote: o.coverNote,
        showCountdown: o.showCountdown,
        status: o.status,
        publishedAt: o.published ? new Date(o.startsAt) : null,
      })
      .returning({ id: s.launches.id });
    const ids = o.products.flatMap((slug) => productId.get(slug) ?? []);
    if (ol && ids.length)
      await tx
        .insert(s.launchProducts)
        .values(ids.map((id, position) => ({ launchId: ol.id, productId: id, position })));
  }
  await tx.insert(s.launchSignups).values(
    Array.from({ length: data.launch.demoSignups }, (_, k) => ({
      launchId: l.id,
      channel: k % 3 ? ("whatsapp" as const) : ("email" as const),
      contact: k % 3 ? demoContact(500 + k) : `anotada${k}@ejemplo.com`,
    })),
  );

  await tx.insert(s.contentBlocks).values({ key: "home", value: data.home });

  // charlas demo con Galú: se vuelven a crear (con sus mensajes) relativas a ahora
  const seededAt = Date.now();
  const convIds = data.demoConversations.map((c) => c.id);
  await tx.delete(s.assistantConversations).where(inArray(s.assistantConversations.id, convIds));
  for (const c of data.demoConversations) {
    const at = new Date(seededAt - c.ago * 60_000);
    await tx.insert(s.assistantConversations).values({
      id: c.id,
      productSlug: c.productSlug ?? null,
      startedAt: at,
      lastAt: new Date(at.getTime() + (c.messages.length - 1) * 30_000),
    });
    await tx.insert(s.assistantMessages).values(
      c.messages.map((m, i) => ({
        conversationId: c.id,
        role: m.role,
        text: m.text,
        unanswered: m.unanswered ?? null,
        sizeAlert: m.sizeAlert ?? null,
        createdAt: new Date(at.getTime() + i * 30_000),
      })),
    );
  }

  // cupones demo del mockup: si ya existen (los editó el taller) no se pisan
  await tx.insert(s.coupons).values(data.demoCoupons).onConflictDoNothing({ target: s.coupons.code });
});

const adminEmail = await upsertAdmin(db);
await db.close();
console.log(`✓ seed: ${data.products.length} productos, ${data.collections.length} colecciones, 1 lanzamiento`);
console.log(`✓ panel del taller: ${adminEmail}`);
if (missing.length)
  console.warn(`⚠ ${missing.length} fotos sin copiar: falta local-assets/mockups/img (ver local-assets/README.md)`);

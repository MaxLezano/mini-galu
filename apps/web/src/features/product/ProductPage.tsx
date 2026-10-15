import type { ProductDetail } from "@mini-galu/contracts";
import { Flower, HandHeart, PencilRuler, Ruler, Scissors } from "lucide-react";
import Link from "next/link";
import type { CSSProperties } from "react";
import { ProductCardContainer } from "@/features/catalog/containers/ProductCardContainer";
import { cover } from "@/lib/product";
import { Stars } from "@/ui/atoms/Stars";
import { Gallery } from "./components/Gallery";
import { ProductInfo } from "./containers/ProductInfo";
import "./product.css";
import { Picture } from "@/ui/atoms/Picture";

const d = (s: number) => ({ "--d": `${s}s` }) as CSSProperties;
const monthFmt = new Intl.DateTimeFormat("es-AR", { month: "long", timeZone: "America/Argentina/Buenos_Aires" });

/** Ficha de producto — design/mockups/producto.html */
export function ProductPage({ product: p, launchAt }: { product: ProductDetail; launchAt: string | null }) {
  const { count, average } = p.rating;
  return (
    <>
      <main className="wrap">
        <nav className="crumbs" aria-label="Migas de pan">
          <Link href="/">Inicio</Link>
          <span>/</span>
          <Link href="/catalogo">Catálogo</Link>
          <span>/</span>
          <Link href={`/catalogo?col=${p.collection.slug}`}>{p.collection.name}</Link>
          <span>/</span>
          <span style={{ color: "var(--cacao)" }}>{p.name}</span>
        </nav>
        <div className="pdp">
          <Gallery product={p} />
          <ProductInfo product={p} launchAt={launchAt} />
        </div>
      </main>

      <section className="bg-linen hem-top section cv-auto">
        <div className="wrap story">
          <Picture src={cover(p, 2)} alt="" data-reveal="mask" loading="lazy" sizes="(max-width: 900px) 100vw, 50vw" />
          <div>
            <span className="eyebrow">Cómo se hizo</span>
            <h2 className="display h2" style={{ margin: "16px 0 20px" }}>
              Bordado <em>puntada</em>
              <br />
              por puntada
            </h2>
            <p className="lead">
              Cada flor del cuello lleva cerca de 40 minutos de bordado a mano. Por eso hacemos pocas por talle y cada
              tanda sale distinta.
            </p>
            <ol className="make" aria-label="Cómo se hace">
              <li data-reveal="">
                <PencilRuler />
                <b>Molde</b>
                <small>diseño propio</small>
              </li>
              <li data-reveal="" style={d(0.12)}>
                <Scissors />
                <b>Corte</b>
                <small>a mano, por talle</small>
              </li>
              <li data-reveal="" style={d(0.24)}>
                <Flower />
                <b>Bordado</b>
                <small>~40 min por flor</small>
              </li>
              <li data-reveal="" style={d(0.36)}>
                <HandHeart />
                <b>Terminaciones</b>
                <small>planchado y revisión</small>
              </li>
            </ol>
            <span className="hand" style={{ fontSize: 34 }}>
              — Gaby, desde el taller
            </span>
          </div>
        </div>
      </section>

      {p.reviews.length > 0 && (
        <section className="section wrap cv-auto" id="resenas">
          <div className="rv-grid">
            <div className="rv-sum">
              <span className="eyebrow">Reseñas</span>
              <b>{String(average).replace(".", ",")}</b>
              <Stars />
              <span className="muted" style={{ fontSize: 13 }}>
                {count} reseñas de compras verificadas
              </span>
              <div className="rv-bars">
                {p.ratingDistribution.map((n, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: la posición ES la cantidad de estrellas
                  <div key={5 - i}>
                    <span>{5 - i}</span>
                    <div className="bar">
                      <i style={{ width: `${count ? (n / count) * 100 : 0}%` }} />
                    </div>
                    <span className="muted">{n}</span>
                  </div>
                ))}
              </div>
              {p.fitJustoPercent !== null && (
                <div
                  className="muted"
                  style={{ fontSize: 13, display: "flex", gap: 8, alignItems: "center", marginTop: 6 }}
                >
                  <Ruler className="i-sm" /> El {p.fitJustoPercent}% dice que el talle es{" "}
                  <b style={{ color: "var(--cacao)" }}>justo</b>
                </div>
              )}
            </div>
            <div className="rv-list">
              {p.reviews.map((r) => (
                <article className="rv" key={`${r.author}-${r.createdAt}`}>
                  <Stars n={r.rating} />
                  <b>{r.title}</b>
                  <p style={{ margin: 0 }}>{r.body}</p>
                  <div className="meta">
                    <span>{r.author}</span>
                    <span>·</span>
                    <span>
                      {r.size ? `Talle ${r.size} · ` : ""}comprado en {monthFmt.format(new Date(r.createdAt))}
                    </span>
                    {r.fit && (
                      <span className="fit">
                        <Ruler className="i-sm" /> Talle {r.fit}
                      </span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {p.completeTheLook.length > 0 && (
        <section className="wrap cv-auto" style={{ paddingBottom: "clamp(64px,9vw,120px)" }}>
          <div className="section-head">
            <div>
              <span className="eyebrow">Completá el look</span>
              <h2 className="display h2" style={{ marginTop: 14 }}>
                Le queda <em>precioso</em> con…
              </h2>
            </div>
          </div>
          <div className="look-grid">
            {p.completeTheLook.map((x, i) => (
              <ProductCardContainer key={x.slug} product={x} index={i} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

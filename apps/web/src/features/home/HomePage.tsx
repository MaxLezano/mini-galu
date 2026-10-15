import { type HomeContent, imageThumb, type ProductSummary } from "@mini-galu/contracts";
import {
  ArrowRight,
  Check,
  CreditCard,
  Gift,
  MessageCircleHeart,
  RefreshCcw,
  Ruler,
  Scissors,
  Shirt,
  Truck,
} from "lucide-react";
import Link from "next/link";
import type { CSSProperties } from "react";
import { OpenGaluButton } from "@/features/assistant/components/OpenGaluButton";
import { LaunchDrop } from "@/features/launch/components/LaunchDrop";
import { cover } from "@/lib/product";
import { BrandIcon } from "@/ui/atoms/BrandIcon";
import { Emphasis } from "@/ui/atoms/Emphasis";
import { Foco } from "@/ui/atoms/Foco";
import { Lookbook } from "./components/Lookbook";
import { Rail } from "./components/Rail";
import { ReviewsBand } from "./components/ReviewsBand";
import "./home.css";
import { Picture } from "@/ui/atoms/Picture";

const d = (s: number) => ({ "--d": `${s}s` }) as CSSProperties;

/** Home — design/mockups/index.html */
export function HomePage({
  home,
  products,
  exchangeDays,
}: {
  home: HomeContent;
  products: ProductSummary[];
  exchangeDays: number;
}) {
  const bySlug = Object.fromEntries(products.map((p) => [p.slug, p]));
  const img = (slug: string, n = 1) => {
    const p = bySlug[slug];
    return p ? cover(p, n) : "";
  };
  const rail = home.railSlugs.flatMap((s) => (bySlug[s] ? [bySlug[s]] : []));
  const launchSlug = home.launch?.collectionSlug;

  return (
    <main>
      {/* HERO */}
      <section className="hero">
        <Picture src={home.hero.imageUrl} alt={home.hero.imageAlt} fetchPriority="high" sizes="100vw" />
        <div className="wrap hero-inner">
          <div className="split">
            <span className="eyebrow">{home.hero.eyebrow}</span>
            <h1 className="display h1">
              {home.hero.titleLines.map((line, i) => (
                <span className="split-line" key={line}>
                  <span style={d(0.2 + i * 0.15)}>
                    <Emphasis text={line} />
                  </span>
                </span>
              ))}
            </h1>
            <p className="lead" data-reveal="" style={d(0.7)}>
              {home.hero.lead}
            </p>
            <div className="hero-cta" data-reveal="" style={d(0.85)}>
              <Link className="btn btn-light" href="/catalogo">
                {home.hero.ctaLabel} <ArrowRight />
              </Link>
              <OpenGaluButton className="btn btn-ghost-light">
                <MessageCircleHeart /> Ayudame a elegir
              </OpenGaluButton>
            </div>
          </div>
          <div className="badge-rot" aria-hidden="true">
            <svg className="ring" viewBox="0 0 148 148">
              <defs>
                <path id="circ" d="M74 74m-58 0a58 58 0 1 1 116 0a58 58 0 1 1-116 0" />
              </defs>
              <text fontFamily="var(--f-ui)" fontSize="11" fontWeight="600" fill="currentColor">
                <textPath href="#circ" textLength="362" lengthAdjust="spacing">
                  DISEÑO PROPIO · BORDADO A MANO · MINI GALÚ ·{" "}
                </textPath>
              </text>
            </svg>
            <div className="core">
              <Foco />
            </div>
          </div>
        </div>
        <span className="scroll-cue" aria-hidden="true" />
      </section>

      {/* MANIFIESTO */}
      <section className="section wrap manifest-wrap">
        <span className="manifest-bow" aria-hidden="true" data-reveal="">
          <Foco />
        </span>
        <p className="display manifest" data-reveal="" style={d(0.1)}>
          Cada prenda nace en el taller: se corta, se cose y se <em className="stitch">borda a mano</em>. Diseños
          propios para <em>días especiales.</em>
        </p>
        <span className="hand manifest-sign" data-reveal="" style={d(0.3)}>
          pocas de cada modelo ♡
        </span>
      </section>

      {/* COLECCIONES */}
      <section className="wrap" style={{ paddingBottom: "clamp(64px,9vw,140px)" }}>
        <div className="section-head">
          <div>
            <span className="eyebrow">Colecciones</span>
            <h2 className="display h2" style={{ marginTop: 14 }}>
              Para cada <em>momento</em>
            </h2>
          </div>
          <Link className="link" href="/catalogo">
            Ver todo el catálogo <ArrowRight className="i-sm" />
          </Link>
        </div>
        <div className="cols">
          {home.featuredCollections.map((c, i) => {
            const soon = c.slug === launchSlug;
            return (
              <Link
                key={c.slug}
                className="col-card"
                href={soon ? "/#lanzamiento" : `/catalogo?col=${c.slug}`}
                data-reveal=""
                style={d(i * 0.12)}
              >
                <div className="arch">
                  {soon && <span className="soon">Próximamente</span>}
                  {c.coverUrl && (
                    <Picture
                      sizes="(max-width: 760px) 100vw, 33vw"
                      src={c.coverUrl}
                      alt={c.label}
                      loading="lazy"
                      style={soon ? { objectPosition: "52% 50%" } : undefined}
                    />
                  )}
                </div>
                <h3 className="display">
                  <Emphasis text={c.title} />
                </h3>
                <span className="muted">{c.tagline}</span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* NOVEDADES */}
      <Rail products={rail} />

      {/* LANZAMIENTO */}
      {home.launch && (
        <LaunchDrop launch={home.launch} avatars={[img("cleo"), img("elsa", 2), img("rebeca", 2)].filter(Boolean)} />
      )}

      {/* EL TALLER */}
      <section className="section bg-linen hem-top" id="taller">
        <div className="wrap taller">
          <div className="taller-media">
            <div className="a" data-reveal="mask">
              <Picture
                src={img("maddie", 2)}
                alt="Detalle de bordado del Set Maddie"
                loading="lazy"
                sizes="(max-width: 900px) 70vw, 30vw"
              />
            </div>
            <div className="b" data-reveal="" style={d(0.3)}>
              <Picture
                src={img("romantico-rojo", 2)}
                alt="Set Romántico Rojo"
                loading="lazy"
                sizes="(max-width: 900px) 45vw, 18vw"
              />
            </div>
            <span className="hand note" data-reveal="" style={d(0.6)}>
              hecho con amor ♡
            </span>
          </div>
          <div>
            <span className="eyebrow">El taller</span>
            <h2 className="display h2" style={{ margin: "16px 0 22px" }}>
              Pocas, <em>lindas</em>,<br />y hechas para durar.
            </h2>
            <p className="lead">
              Mini Galú empezó en una mesa de costura con una idea simple: vestir a las nenas como en los cuentos, con
              telas nobles y detalles que se notan de cerca. Hoy somos marca registrada, pero cada cuello todavía se
              borda a mano.
            </p>
            <div className="feats">
              <div className="feat" data-reveal="">
                <Scissors />
                <b>Bordado a mano</b>
                <span>Flores, puntillas y cuellos uno por uno.</span>
              </div>
              <div className="feat" data-reveal="" style={d(0.1)}>
                <Shirt />
                <b>Telas nobles</b>
                <span>Lino, plumeti, pana y algodón.</span>
              </div>
              <div className="feat" data-reveal="" style={d(0.2)}>
                <Ruler />
                <b>12 meses a talle 10</b>
                <span>Tabla de medidas real en cada modelo.</span>
              </div>
            </div>
            <span className="hand" style={{ fontSize: 38 }}>
              — Gaby
            </span>
          </div>
        </div>
      </section>

      {/* LOOKBOOK */}
      <Lookbook spots={home.lookbook} products={bySlug} />

      {/* RESEÑAS */}
      {home.reviews.featured.length > 0 && <ReviewsBand rating={home.reviews.rating} reviews={home.reviews.featured} />}

      {/* GALÚ */}
      <section className="bg-cacao" style={{ paddingBlock: "clamp(72px,9vw,140px)" }}>
        <div className="wrap galu-teaser">
          <div>
            <span className="eyebrow" style={{ color: "var(--rosa)" }}>
              Asistente del taller
            </span>
            <h2 className="display h2" style={{ margin: "16px 0 18px" }}>
              Conocé a <em>Galú</em>,<br />
              tu ayudante de compras
            </h2>
            <p className="lead" style={{ color: "rgba(244,237,227,.75)" }}>
              Consulta el catálogo en vivo: sabe qué hay en stock, en qué talle, cuánto sale y dónde está tu pedido.
            </p>
            <ul className="galu-perks">
              {[
                "Stock y talles en tiempo real",
                "Recomendaciones por edad, ocasión y presupuesto",
                "Agrega a tu bolsa y te guía hasta pagar",
                "Seguimiento de tu envío Andreani",
              ].map((t) => (
                <li key={t}>
                  <Check /> {t}
                </li>
              ))}
            </ul>
            <OpenGaluButton className="btn btn-rose">
              <MessageCircleHeart /> Charlar con Galú
            </OpenGaluButton>
          </div>
          <ChatDemo rebeca={bySlug.rebeca} samanta={bySlug.samanta} />
        </div>
      </section>

      {/* INSTAGRAM */}
      <section className="section wrap">
        <div className="section-head">
          <div>
            <span className="eyebrow">Instagram</span>
            <h2 className="display h2" style={{ marginTop: 14, overflowWrap: "anywhere" }}>
              <em>@{home.instagram.handle}</em>
            </h2>
          </div>
          <a className="btn btn-ghost" href={home.instagram.url}>
            <BrandIcon name="instagram" className="i-sm" /> Seguinos
          </a>
        </div>
        <div className="ig">
          {home.instagram.imageUrls.map((u, i) => (
            <a key={u} href={home.instagram.url} data-reveal="" style={d(i * 0.05)} aria-label="Ver en Instagram">
              <Picture src={u} alt="" loading="lazy" sizes="(max-width: 760px) 33vw, 17vw" />
              <BrandIcon name="instagram" />
            </a>
          ))}
        </div>
      </section>

      <section className="perks">
        <div>
          <Truck />
          <span>
            <b>Envíos Andreani</b>A todo el país, con seguimiento
          </span>
        </div>
        <div>
          <CreditCard />
          <span>
            <b>Pagás en cuotas</b>Crédito, débito o dinero en cuenta con Mercado Pago
          </span>
        </div>
        <div>
          <Gift />
          <span>
            <b>Gift cards</b>Para cuando no sabés el talle
          </span>
        </div>
        <div>
          <RefreshCcw />
          <span>
            <b>Cambios fáciles</b>
            {exchangeDays} días para cambiar talle
          </span>
        </div>
      </section>
    </main>
  );
}

/** Conversación de muestra (con stock real del Rebeca). */
function ChatDemo({ rebeca, samanta }: { rebeca?: ProductSummary; samanta?: ProductSummary }) {
  if (!rebeca || !samanta) return null;
  const t2 = rebeca.variants.find((v) => v.size === "2")?.stock ?? 0;
  return (
    <div className="chat-demo" data-reveal="">
      <div className="msg me">Hola! busco algo para el bautismo de mi sobrina, tiene 2 años</div>
      <div className="msg bot">
        ¡Qué lindo! Para bautismo te recomiendo el <b>{rebeca.name}</b>: blanco, mangas globo y mucho vuelo.{" "}
        {t2 > 0 && (
          <>
            Hay <b>{t2} en talle 2</b>.
          </>
        )}
      </div>
      <div className="msg cards">
        <div className="mini-card">
          <img loading="lazy" src={imageThumb(cover(rebeca))} alt="" />
          <div>
            <b>{rebeca.name}</b>
            <div className="stock">{t2 > 0 ? `${t2} en stock · talle 2` : "Sin stock en talle 2"}</div>
            <Link className="btn" href={`/producto/${rebeca.slug}`}>
              Ver
            </Link>
          </div>
        </div>
        <div className="mini-card">
          <img loading="lazy" src={imageThumb(cover(samanta))} alt="" />
          <div>
            <b>{samanta.name.replace("Vestido ", "")}</b>
            <div className="stock">Desde talle {samanta.variants.find((v) => v.stock > 0)?.size ?? "—"}</div>
            <Link className="btn btn-ghost" href={`/producto/${samanta.slug}`}>
              Ver
            </Link>
          </div>
        </div>
      </div>
      <div className="msg bot">¿Querés ver algo que combine o preferís una gift card?</div>
    </div>
  );
}

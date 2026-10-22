import { type HomeContent, hasImageVariants, imageThumb, type ProductSummary } from "@mini-galu/contracts";
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
import { type ChatDemoPick, launchAvatars, pickChatDemo } from "./home-picks";
import "./home.css";
import { Picture } from "@/ui/atoms/Picture";

const d = (s: number) => ({ "--d": `${s}s` }) as CSSProperties;

/** Home — design/mockups/index.html */
export function HomePage({
  home,
  products,
  exchangeDays,
  instagram,
}: {
  home: HomeContent;
  products: ProductSummary[];
  exchangeDays: number;
  /** Tienda y pagos → Datos de la tienda (las fotos de la grilla vienen en `home.instagram`). */
  instagram: { url: string; handle: string };
}) {
  const bySlug = Object.fromEntries(products.map((p) => [p.slug, p]));
  const rail = home.railSlugs.flatMap((s) => (bySlug[s] ? [bySlug[s]] : []));
  const launchSlug = home.launch?.collectionSlug;
  // fotos de "El taller" (Portada de la tienda en el panel): sin elegir, la columna de fotos no se muestra
  const [tallerA, tallerB] = home.taller;

  return (
    <main>
      {/* HERO */}
      <section className="hero">
        {/* la portada cubre todo el alto: en una pantalla más angosta que 16:9 la foto apaisada mide ~1.78 × el alto
            (con "100vw" el celular bajaba la de 640 px y la estiraba al doble) */}
        {home.hero.imageUrl && (
          <Picture
            src={home.hero.imageUrl}
            alt={home.hero.imageAlt}
            fetchPriority="high"
            sizes="(max-aspect-ratio: 16/9) 178vh, 100vw"
          />
        )}
        {home.hero.imageUrl && hasImageVariants(home.hero.imageUrl) && (
          <img className="hero-veil" src={imageThumb(home.hero.imageUrl)} alt="" aria-hidden="true" />
        )}
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
            {/* gira el span, no el svg: Chrome anima la rotación de un svg en el hilo principal (layout en cada cuadro) */}
            <span className="ring-spin">
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
            </span>
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

      {/* COLECCIONES (lo vacío no se muestra: una tienda recién estrenada todavía no eligió nada) */}
      {home.featuredCollections.length > 0 && (
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
      )}

      {/* NOVEDADES */}
      {rail.length > 0 && <Rail products={rail} />}

      {/* LANZAMIENTO */}
      {home.launch && <LaunchDrop launch={home.launch} avatars={launchAvatars(products, rail, launchSlug)} />}

      {/* EL TALLER */}
      <section className="section bg-linen hem-top" id="taller">
        <div className="wrap taller">
          {tallerA && tallerB && (
            <div className="taller-media">
              <div className="a" data-reveal="mask">
                <Picture
                  src={tallerA.imageUrl}
                  alt={tallerA.alt}
                  loading="lazy"
                  sizes="(max-width: 900px) 70vw, 30vw"
                />
              </div>
              <div className="b" data-reveal="" style={d(0.3)}>
                <Picture
                  src={tallerB.imageUrl}
                  alt={tallerB.alt}
                  loading="lazy"
                  sizes="(max-width: 900px) 45vw, 18vw"
                />
              </div>
              <span className="hand note" data-reveal="" style={d(0.6)}>
                hecho con amor ♡
              </span>
            </div>
          )}
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
      {home.lookbook.length > 0 && <Lookbook spots={home.lookbook} products={bySlug} />}

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
          <ChatDemo pick={pickChatDemo(products)} />
        </div>
      </section>

      {/* INSTAGRAM */}
      <section className="section wrap">
        <div className="section-head">
          <div>
            <span className="eyebrow">Instagram</span>
            <h2 className="display h2" style={{ marginTop: 14, overflowWrap: "anywhere" }}>
              <em>{instagram.handle}</em>
            </h2>
          </div>
          <a className="btn btn-ghost" href={instagram.url}>
            <BrandIcon name="instagram" className="i-sm" /> Seguinos
          </a>
        </div>
        {home.instagram.posts.length > 0 && (
          <div className="ig">
            {home.instagram.posts.map((p, i) => (
              <a key={p.imageUrl} href={p.href} data-reveal="" style={d(i * 0.05)} aria-label="Ver en Instagram">
                <Picture src={p.imageUrl} alt="" loading="lazy" sizes="(max-width: 760px) 33vw, 17vw" />
                <BrandIcon name="instagram" />
              </a>
            ))}
          </div>
        )}
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

/** Conversación de muestra con el stock de ese momento. */
function ChatDemo({ pick }: { pick: ChatDemoPick | null }) {
  if (!pick) return null;
  const { main, other, size, stock, occasion } = pick;
  return (
    <div className="chat-demo" data-reveal="">
      <div className="msg me">
        Hola! busco algo para el {occasion} de mi sobrina, tiene {size} años
      </div>
      <div className="msg bot">
        ¡Qué lindo! Para {occasion} te recomiendo el <b>{main.name}</b>, en {main.color.name.toLowerCase()}. Hay{" "}
        <b>
          {stock} en talle {size}
        </b>
        .
      </div>
      <div className="msg cards">
        <div className="mini-card">
          <img loading="lazy" src={imageThumb(cover(main))} alt="" />
          <div>
            <b>{main.name}</b>
            <div className="stock">
              {stock} en stock · talle {size}
            </div>
            <Link className="btn" href={`/producto/${main.slug}`}>
              Ver
            </Link>
          </div>
        </div>
        <div className="mini-card">
          <img loading="lazy" src={imageThumb(cover(other))} alt="" />
          <div>
            <b>{other.name.replace("Vestido ", "")}</b>
            <div className="stock">Desde talle {other.variants.find((v) => v.stock > 0)?.size ?? "—"}</div>
            <Link className="btn btn-ghost" href={`/producto/${other.slug}`}>
              Ver
            </Link>
          </div>
        </div>
      </div>
      <div className="msg bot">¿Querés ver algo que combine o preferís una gift card?</div>
    </div>
  );
}

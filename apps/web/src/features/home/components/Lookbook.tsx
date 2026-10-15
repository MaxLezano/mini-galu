"use client";

import { formatARS, imageThumb, type LookbookSpot, type ProductSummary } from "@mini-galu/contracts";
import { ArrowRight, Plus } from "lucide-react";
import Link from "next/link";
import { type CSSProperties, useEffect, useState } from "react";
import { Picture } from "@/ui/atoms/Picture";

/** Lookbook con "+" en cada foto: la ficha de la prenda se abre hacia arriba. */
export function Lookbook({
  spots,
  products,
}: {
  spots: LookbookSpot[];
  products: Record<string, ProductSummary | undefined>;
}) {
  const [open, setOpen] = useState<number | null>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => !(e.target as Element).closest(".hot") && setOpen(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  return (
    <section className="section wrap">
      <div className="section-head">
        <div>
          <span className="eyebrow">Lookbook</span>
          <h2 className="display h2" style={{ marginTop: 14 }}>
            Tocá la foto, <em>llevate el look</em>
          </h2>
        </div>
        <Link className="link" href="/catalogo?view=lookbook">
          Ver lookbook completo <ArrowRight className="i-sm" />
        </Link>
      </div>
      <div className="look">
        {spots.map((s, i) => {
          const p = products[s.productSlug];
          const soon = p?.status === "draft";
          return (
            <figure key={s.imageUrl} data-reveal="mask" style={{ "--d": `${i * 0.15}s` } as CSSProperties}>
              <Picture
                sizes="(max-width: 760px) 100vw, 50vw"
                src={s.imageUrl}
                alt={s.alt}
                style={{ objectPosition: s.objectPosition ?? undefined }}
                loading="lazy"
              />
              {s.caption && <figcaption>{s.caption}</figcaption>}
              {p && (
                <div className={`hot ${open === i ? "is-open" : ""}`}>
                  <button
                    type="button"
                    aria-label="Ver prenda"
                    aria-expanded={open === i}
                    onClick={() => setOpen(open === i ? null : i)}
                  >
                    <Plus />
                  </button>
                  <div className="hot-pop">
                    <img
                      loading="lazy"
                      src={imageThumb(s.imageUrl)}
                      alt=""
                      style={{ objectPosition: s.objectPosition ?? undefined }}
                    />
                    <div>
                      {soon && (
                        <span className="label-tag is-dark" style={{ marginBottom: 6 }}>
                          Próximamente
                        </span>
                      )}
                      <b>{p.name}</b>
                      {soon ? (
                        <a className="link" href="#lanzamiento">
                          Avisame cuando salga
                        </a>
                      ) : (
                        <>
                          <span className="muted" style={{ fontSize: 13 }}>
                            {formatARS(p.priceCents)}
                          </span>
                          <br />
                          <Link className="link" href={`/producto/${p.slug}`}>
                            Ver prenda
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </figure>
          );
        })}
      </div>
    </section>
  );
}

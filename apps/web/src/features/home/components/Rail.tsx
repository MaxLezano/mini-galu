"use client";

import type { ProductSummary } from "@mini-galu/contracts";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import { Navigation } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import { ProductCardContainer } from "@/features/catalog/containers/ProductCardContainer";

/** "Lo nuevo de la semana": tarjetas enteras según el ancho, sin cortar ninguna contra el borde. */
export function Rail({ products }: { products: ProductSummary[] }) {
  const prev = useRef<HTMLButtonElement>(null);
  const next = useRef<HTMLButtonElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section className="bg-linen hem-top hem-bottom" style={{ paddingBlock: "clamp(64px,8vw,120px)" }}>
      <div className="wrap section-head">
        <div>
          <span className="eyebrow">Recién salidas del taller</span>
          <h2 className="display h2" style={{ marginTop: 14 }}>
            Lo <em>nuevo</em>
            <br />
            de la semana
          </h2>
        </div>
        <div className="rail-nav">
          <button type="button" ref={prev} className="rail-prev" aria-label="Anterior">
            <ArrowLeft />
          </button>
          <button type="button" ref={next} className="rail-next" aria-label="Siguiente">
            <ArrowRight />
          </button>
        </div>
      </div>
      <div className="wrap" ref={rail}>
        <Swiper
          className={`rail ${inView ? "is-in" : ""}`}
          modules={[Navigation]}
          slidesPerView={1.6}
          spaceBetween={14}
          grabCursor
          onBeforeInit={(s) => {
            if (typeof s.params.navigation === "object") {
              s.params.navigation.prevEl = prev.current;
              s.params.navigation.nextEl = next.current;
            }
          }}
          navigation={{ prevEl: prev.current, nextEl: next.current }}
          breakpoints={{
            520: { slidesPerView: 2, spaceBetween: 18 },
            860: { slidesPerView: 3, spaceBetween: 22 },
            1180: { slidesPerView: 4, spaceBetween: 24 },
            1900: { slidesPerView: 5, spaceBetween: 28 },
          }}
        >
          {products.map((p, i) => (
            <SwiperSlide key={p.slug} style={{ "--i": i } as CSSProperties}>
              <ProductCardContainer product={p} arch index={i} reveal={false} />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
}

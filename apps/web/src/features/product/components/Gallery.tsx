"use client";

import { imageThumb, type ProductDetail } from "@mini-galu/contracts";
import { ZoomIn } from "lucide-react";
import { useRef, useState } from "react";
import type { Swiper as SwiperType } from "swiper";
import { FreeMode, Pagination, Thumbs } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import { Picture } from "@/ui/atoms/Picture";

/** Galería con miniaturas verticales, contador y zoom que sigue al mouse. */
export function Gallery({ product: p }: { product: ProductDetail }) {
  const [thumbs, setThumbs] = useState<SwiperType | null>(null);
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState(false);
  const main = useRef<HTMLDivElement>(null);
  const canHover = () => matchMedia("(hover: hover)").matches;

  return (
    <div className="gallery">
      <Swiper
        className="thumbs"
        onSwiper={setThumbs}
        direction="vertical"
        slidesPerView="auto"
        spaceBetween={10}
        watchSlidesProgress
        freeMode
        modules={[FreeMode, Thumbs]}
      >
        {p.images.map((im) => (
          <SwiperSlide key={im.url}>
            <img loading="lazy" src={imageThumb(im.url)} alt="" />
          </SwiperSlide>
        ))}
      </Swiper>
      {/* biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: el zoom es un extra visual, la foto completa ya se ve */}
      <div
        className={`pdp-main ${zoom ? "zoom" : ""}`}
        ref={main}
        onMouseMove={(e) => {
          if (!canHover() || !main.current) return;
          const im = main.current.querySelector<HTMLImageElement>(".swiper-slide-active img");
          const r = main.current.getBoundingClientRect();
          if (im)
            im.style.transformOrigin = `${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`;
        }}
        onClick={(e) => canHover() && (e.target as Element).tagName === "IMG" && setZoom((z) => !z)}
        onMouseLeave={() => setZoom(false)}
      >
        <Swiper
          modules={[Thumbs, Pagination]}
          thumbs={{ swiper: thumbs && !thumbs.destroyed ? thumbs : null }}
          pagination={{ clickable: true }}
          onSlideChange={(s) => {
            setIndex(s.activeIndex);
            setZoom(false);
          }}
        >
          {p.images.map((im, i) => (
            <SwiperSlide key={im.url}>
              <Picture
                src={im.url}
                alt={`${p.name}, foto ${i + 1}`}
                loading={i ? "lazy" : undefined}
                fetchPriority={i ? undefined : "high"}
                sizes="(max-width: 900px) 100vw, 55vw"
              />
            </SwiperSlide>
          ))}
        </Swiper>
        <div className="tags">
          {p.status === "draft" ? (
            <span className="label-tag is-dark">Próximamente</span>
          ) : p.tag ? (
            <span className="label-tag">{p.tag}</span>
          ) : null}
        </div>
        <span className="zoom-hint">
          <ZoomIn className="i-sm" /> Tocá para ampliar
        </span>
        <span className="counter">
          {index + 1} / {p.images.length}
        </span>
      </div>
    </div>
  );
}

"use client";

import { type FeaturedReview, imageThumb, type Rating } from "@mini-galu/contracts";
import { useEffect, useRef } from "react";
import { isStill } from "@/features/shell/craft";
import { Stars } from "@/ui/atoms/Stars";

/** Cinta infinita: avanza sola, se frena con el mouse encima y se arrastra con mouse o dedo. */
function useMarquee(band: React.RefObject<HTMLDivElement | null>, track: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const b = band.current;
    const t = track.current;
    if (!b || !t) return;
    const SPEED = 28;
    let x = 0;
    let half = t.scrollWidth / 2;
    let hover = false;
    let vel = 0;
    let last = performance.now();
    let drag: { x0: number; start: number; t: number; px: number } | null = null;
    let raf = 0;
    const reduce = isStill();
    const wrap = () => {
      if (half) {
        x %= half;
        if (x > 0) x -= half;
      }
    };
    const measure = () => {
      half = t.scrollWidth / 2;
    };
    const enter = (e: PointerEvent) => {
      if (e.pointerType === "mouse") hover = true;
    };
    const leave = () => {
      hover = false;
    };
    const down = (e: PointerEvent) => {
      drag = { x0: e.clientX, start: x, t: performance.now(), px: e.clientX };
      vel = 0;
      b.setPointerCapture(e.pointerId);
      b.classList.add("is-drag");
    };
    const move = (e: PointerEvent) => {
      if (!drag) return;
      const now = performance.now();
      vel = ((e.clientX - drag.px) / Math.max(1, now - drag.t)) * 1000;
      drag.px = e.clientX;
      drag.t = now;
      x = drag.start + (e.clientX - drag.x0);
      wrap();
    };
    const end = () => {
      drag = null;
      b.classList.remove("is-drag");
    };
    const frame = (now: number) => {
      const dt = Math.min(64, now - last) / 1000;
      last = now;
      if (!drag) {
        vel *= 0.92;
        x += vel * dt;
        if (!hover && !reduce) x -= SPEED * dt;
        wrap();
      }
      t.style.transform = `translate3d(${x}px,0,0)`;
      raf = requestAnimationFrame(frame);
    };
    addEventListener("resize", measure);
    b.addEventListener("pointerenter", enter);
    b.addEventListener("pointerleave", leave);
    b.addEventListener("pointerdown", down);
    b.addEventListener("pointermove", move);
    b.addEventListener("pointerup", end);
    b.addEventListener("pointercancel", end);
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("resize", measure);
      b.removeEventListener("pointerenter", enter);
      b.removeEventListener("pointerleave", leave);
      b.removeEventListener("pointerdown", down);
      b.removeEventListener("pointermove", move);
      b.removeEventListener("pointerup", end);
      b.removeEventListener("pointercancel", end);
    };
  }, [band, track]);
}

export function ReviewsBand({ rating, reviews }: { rating: Rating; reviews: FeaturedReview[] }) {
  const band = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  useMarquee(band, track);
  const avg = rating.average.toFixed(1).replace(".", ",");
  const card = (r: FeaturedReview, hidden: boolean, k: number) => (
    <article className="review" aria-hidden={hidden || undefined} key={`${hidden ? "b" : "a"}${k}`}>
      <Stars n={r.rating} />
      <q>{r.body}</q>
      <footer>
        {(r.photoUrl ?? r.product.imageUrl) && (
          <img loading="lazy" src={imageThumb(r.photoUrl ?? r.product.imageUrl ?? "")} alt="" />
        )}
        <div>
          <b>{r.author}</b>
          <span className="muted">
            {r.city ? `${r.city} · ` : ""}compró {r.product.name}
          </span>
        </div>
      </footer>
    </article>
  );

  return (
    <section className="bg-rosa hem-top hem-bottom" style={{ paddingBlock: "clamp(64px,8vw,120px)" }}>
      <div className="wrap section-head">
        <div>
          <span className="eyebrow">Lo que dicen las familias</span>
          <h2 className="display h2" style={{ marginTop: 14 }}>
            Hechas para <em>recordarse</em>
          </h2>
        </div>
        <div className="reviews-sum">
          <b>{avg}</b>
          <div>
            <Stars />
            <div className="muted" style={{ fontSize: 13 }}>
              {rating.count} reseñas verificadas
            </div>
          </div>
        </div>
      </div>
      <div className="reviews" ref={band} role="region" aria-label="Reseñas de clientes">
        <div className="reviews-track" ref={track}>
          {reviews.map((r, k) => card(r, false, k))}
          {reviews.map((r, k) => card(r, true, k))}
        </div>
      </div>
    </section>
  );
}

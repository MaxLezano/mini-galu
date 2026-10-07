"use client";

/**
 * Detalles de taller (mockups app.js): reveal al scrollear, aguja que cose los dobladillos,
 * moños que se atan, bordados que florecen, cinta métrica, estallido de puntadas y prenda que vuela a la bolsa.
 * Todo se apaga con prefers-reduced-motion o con ?static (capturas).
 */

export const isStill = () =>
  typeof window === "undefined" ||
  document.documentElement.classList.contains("static") ||
  matchMedia("(prefers-reduced-motion: reduce)").matches;

const $$ = <T extends Element = HTMLElement>(s: string, root: ParentNode = document) => [
  ...root.querySelectorAll<T>(s),
];

/** Títulos y encabezados entran suave al aparecer. */
export function autoReveal(root: ParentNode = document) {
  const skip =
    "[data-reveal], .split, .hero, .modal, .drawer, .galu, .mega, .search-ov, .mnav, .nav-pop, .adm-side, .adm-top, .msg";
  for (const el of $$(".panel-head, .section-head > div, .cat-hero > div, .page-head, h1.display, h2.display", root)) {
    if (el.closest(skip) || el.querySelector("[data-reveal]")) continue;
    el.setAttribute("data-reveal", "");
  }
}

export function observeReveal(root: ParentNode = document): () => void {
  const pending = $$("[data-reveal]:not(.is-in), .split:not(.is-in)", root);
  if (isStill()) {
    for (const el of pending) el.classList.add("is-in");
    return () => {};
  }
  // Las máscaras (clip-path cerrado) nunca "entran" para Chrome: se observa al contenedor.
  const targets = new Map<Element, Element[]>();
  const io = new IntersectionObserver(
    (es) => {
      for (const e of es) {
        if (!e.isIntersecting) continue;
        for (const el of targets.get(e.target) ?? []) el.classList.add("is-in");
        targets.delete(e.target);
        io.unobserve(e.target);
      }
    },
    { threshold: 0.1, rootMargin: "0px 0px -5% 0px" },
  );
  for (const el of pending) {
    const t = el.getAttribute("data-reveal") === "mask" && el.parentElement ? el.parentElement : el;
    targets.set(t, [...(targets.get(t) ?? []), el]);
    io.observe(t);
  }
  return () => io.disconnect();
}

/** Moños que se atan, bordados que florecen y eyebrows que se cosen. */
export function drawCraft(root: ParentNode = document): () => void {
  for (const el of $$(".logo .bow, .manifest-bow, .badge-rot .core, .end-tile .emb", root)) el.classList.add("draw");
  for (const svg of $$("svg.emb", root)) svg.classList.add("bloom");
  const items = $$(".draw:not(.is-drawn), svg.emb:not(.is-drawn), .eyebrow:not(.is-in)", root);
  if (isStill()) {
    for (const el of items) el.classList.add("is-in", "is-drawn");
    return () => {};
  }
  const io = new IntersectionObserver(
    (es) => {
      for (const e of es) {
        if (!e.isIntersecting) continue;
        e.target.classList.add(e.target.classList.contains("eyebrow") ? "is-in" : "is-drawn");
        io.unobserve(e.target);
      }
    },
    { threshold: 0.3 },
  );
  for (const el of items) io.observe(el);
  return () => io.disconnect();
}

const NEEDLE =
  '<svg viewBox="0 0 34 10" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="M2.2 3.3C.9 3.6.9 6.4 2.2 6.7L8.5 6.3 33.4 5.1V4.9L8.5 3.7ZM3.2 5a1.5.6 0 1 0 3 0 1.5.6 0 1 0-3 0Z"/><path d="M9 4.45 29 4.92" stroke="#fff" stroke-opacity=".55" stroke-width=".5" stroke-linecap="round"/></svg>';

/** La primera vez que un dobladillo entra en pantalla, una aguja lo cose (alternando el sentido). */
export function sewSeams(root: ParentNode = document): () => void {
  if (isStill()) return () => {};
  const SPEED = 862;
  const WAVE = 280;
  const AMP = 5;
  const K = (Math.PI * 2) / WAVE;
  const ease = (p: number) => -(Math.cos(Math.PI * p) - 1) / 2;
  const runs: HTMLElement[] = [];

  function sew(run: HTMLElement, host: HTMLElement, side: string, rtl: boolean) {
    const W = host.clientWidth;
    const svg = run.firstElementChild as SVGElement;
    const dist = W + 80;
    const T = Math.min(2350, Math.max(910, (dist / SPEED) * 1000));
    const t0 = performance.now();
    const set = (l: string, r: string) => {
      host.style.setProperty(`--sl-${side}`, l);
      host.style.setProperty(`--sr-${side}`, r);
    };
    const frame = (now: number) => {
      const t = Math.min(1, (now - t0) / T);
      const d = dist * (0.7 * t + 0.3 * ease(t));
      const x = rtl ? W + 40 - d : d - 40;
      const y = AMP * Math.sin(K * d);
      const slope = (rtl ? -1 : 1) * AMP * K * Math.cos(K * d);
      const r = ((Math.atan(slope) * 180) / Math.PI) * 1.1;
      svg.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(2)}px) rotate(${r.toFixed(1)}deg)${rtl ? " scaleX(-1)" : ""}`;
      svg.style.opacity = String(Math.min(1, t * 20, (1 - t) * 14));
      const c = Math.max(0, Math.min(W, x));
      rtl ? set(`${c}px`, "0px") : set("0px", `${W - c}px`);
      if (t < 1) requestAnimationFrame(frame);
      else {
        set("0px", "0px");
        run.remove();
      }
    };
    requestAnimationFrame(frame);
  }

  const io = new IntersectionObserver(
    (es) => {
      for (const e of es) {
        if (!e.isIntersecting) continue;
        io.unobserve(e.target);
        const run = e.target as HTMLElement;
        if (run.parentElement)
          sew(run, run.parentElement, run.classList.contains("top") ? "top" : "bottom", run.dataset.rtl === "1");
      }
    },
    { threshold: 1, rootMargin: "0px 0px -18% 0px" },
  );

  let n = 0;
  for (const host of $$("main .hem-top, main .hem-bottom, .site-footer.hem-top", root)) {
    for (const side of ["top", "bottom"] as const) {
      if (!host.classList.contains(`hem-${side}`) || host.classList.contains(`sew-${side}`)) continue;
      host.classList.add(`sew-${side}`);
      const run = document.createElement("span");
      run.className = `sew-run ${side}`;
      run.dataset.rtl = String(n++ % 2);
      run.setAttribute("aria-hidden", "true");
      run.innerHTML = NEEDLE;
      host.append(run);
      runs.push(run);
      io.observe(run);
    }
  }
  return () => io.disconnect();
}

/** Cinta métrica: progreso de lectura. */
export function measuringTape(): () => void {
  if (isStill()) return () => {};
  const tape = document.createElement("div");
  tape.className = "tape";
  tape.setAttribute("aria-hidden", "true");
  tape.innerHTML = "<i></i><b></b>";
  document.body.append(tape);
  let raf = 0;
  const upd = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    const p = max > 0 ? scrollY / max : 0;
    tape.style.setProperty("--p", `${(p * innerWidth).toFixed(1)}px`);
    tape.classList.toggle("is-on", p > 0.002);
  };
  const onScroll = () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(upd);
  };
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", upd);
  upd();
  return () => {
    removeEventListener("scroll", onScroll);
    removeEventListener("resize", upd);
    tape.remove();
  };
}

/** Estallido de puntadas alrededor del corazón al guardar un favorito. */
export function stitchBurst(el: Element) {
  if (isStill()) return;
  const r = el.getBoundingClientRect();
  const b = document.createElement("span");
  b.className = "stitch-burst";
  b.style.left = `${r.left + r.width / 2}px`;
  b.style.top = `${r.top + r.height / 2}px`;
  b.innerHTML = Array.from({ length: 10 }, (_, k) => `<i style="--a:${k * 36}deg"></i>`).join("");
  document.body.append(b);
  setTimeout(() => b.remove(), 800);
}

/** La prenda vuela en arco hasta la bolsa. Devuelve true si animó (para esperar antes de abrir la bolsa). */
export function flyToBag(src: HTMLImageElement | null | undefined): boolean {
  const bag = document.getElementById("cart-btn");
  if (!src || !bag || isStill()) return false;
  const a = src.getBoundingClientRect();
  const z = bag.getBoundingClientRect();
  if (!a.width) return false;
  const w = Math.min(120, a.width * 0.5);
  const h = w * 1.3;
  const f = document.createElement("div");
  f.className = "fly";
  f.style.cssText = `left:${a.left + a.width / 2 - w / 2}px;top:${a.top + a.height / 2 - h / 2}px;width:${w}px;height:${h}px`;
  f.innerHTML = `<img src="${src.currentSrc || src.src}" alt="">`;
  document.body.append(f);
  const dx = z.left + z.width / 2 - (a.left + a.width / 2);
  const dy = z.top + z.height / 2 - (a.top + a.height / 2);
  const lift = Math.min(-80, dy - 140);
  f.animate(
    [
      { transform: "translate(0,0) scale(1) rotate(0)", borderRadius: "14px", opacity: 1 },
      {
        transform: `translate(${dx * 0.45}px, ${lift}px) scale(.7) rotate(-10deg)`,
        borderRadius: "40%",
        opacity: 1,
        offset: 0.45,
      },
      { transform: `translate(${dx}px, ${dy}px) scale(.12) rotate(8deg)`, borderRadius: "50%", opacity: 0.4 },
    ],
    { duration: 900, easing: "cubic-bezier(.45,.05,.35,1)" },
  ).onfinish = () => {
    f.remove();
    bag.classList.remove("catch");
    void bag.offsetWidth;
    bag.classList.add("catch");
  };
  return true;
}

/** Badge de la bolsa que salta. */
export function bumpBadge() {
  const b = document.getElementById("cart-badge");
  if (!b) return;
  b.classList.remove("bump");
  void b.offsetWidth;
  b.classList.add("bump");
}

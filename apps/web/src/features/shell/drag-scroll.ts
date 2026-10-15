/**
 * Arrastrar con el mouse cualquier fila con scroll horizontal (sugerencias y tarjetas de Galú, tabs, chips, tablas,
 * tablero de pedidos). En pantallas táctiles el navegador ya desplaza con el dedo: esto es solo para `pointerType`
 * mouse. Si hubo arrastre, el click que viene después se descarta (no se manda la sugerencia ni se abre el link).
 */

/** Distancia (px) a partir de la cual el gesto deja de ser un click y pasa a ser un arrastre. */
export const DRAG_THRESHOLD = 6;

/** Lo que tiene su propio gesto de arrastre o de selección: ahí no se desplaza la fila. */
const SKIP = "input, textarea, select, [contenteditable], [draggable='true'], .ocard, .swiper";

export function isHorizontalScroller(el: Element): boolean {
  const { overflowX } = getComputedStyle(el);
  return (overflowX === "auto" || overflowX === "scroll") && el.scrollWidth > el.clientWidth + 1;
}

function scrollerFrom(target: Element | null): HTMLElement | null {
  for (let el = target; el && el !== document.body; el = el.parentElement) {
    if (isHorizontalScroller(el)) return el as HTMLElement;
  }
  return null;
}

export function dragScroll(): () => void {
  let drag: { el: HTMLElement; x: number; left: number; moved: boolean; snap: string } | null = null;

  const onDown = (e: PointerEvent) => {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    const target = e.target as Element | null;
    if (target?.closest(SKIP)) return;
    const el = scrollerFrom(target);
    if (el) drag = { el, x: e.clientX, left: el.scrollLeft, moved: false, snap: el.style.scrollSnapType };
  };

  const onMove = (e: PointerEvent) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (!drag.moved) {
      if (Math.abs(dx) < DRAG_THRESHOLD) return;
      drag.moved = true;
      // el snap obligatorio (tarjetas de Galú) frenaría el arrastre: se apaga mientras dura y vuelve al soltar
      drag.el.style.scrollSnapType = "none";
      drag.el.classList.add("is-dragging");
      getSelection()?.removeAllRanges();
    }
    drag.el.scrollLeft = drag.left - dx;
  };

  const onUp = () => {
    if (!drag) return;
    const { el, moved, snap } = drag;
    drag = null;
    if (!moved) return;
    el.style.scrollSnapType = snap;
    el.classList.remove("is-dragging");
    // el click llega justo después del pointerup: se descarta una sola vez
    const swallow = (ev: Event) => {
      ev.preventDefault();
      ev.stopPropagation();
    };
    window.addEventListener("click", swallow, { capture: true, once: true });
    setTimeout(() => window.removeEventListener("click", swallow, { capture: true }), 0);
  };

  // sin esto, arrastrar sobre una foto o un link arranca el drag & drop nativo del navegador
  const onDragStart = (e: DragEvent) => {
    if (drag) e.preventDefault();
  };

  document.addEventListener("pointerdown", onDown);
  window.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onUp);
  document.addEventListener("dragstart", onDragStart);
  return () => {
    document.removeEventListener("pointerdown", onDown);
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onUp);
    document.removeEventListener("dragstart", onDragStart);
  };
}

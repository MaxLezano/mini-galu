import { emphasis } from "@/lib/product";

/** Renderiza "para *crecer*" con <em> en lo marcado (títulos editables). */
export function Emphasis({ text }: { text: string }) {
  return (
    <>
      {emphasis(text).map((p, i) =>
        // biome-ignore lint/suspicious/noArrayIndexKey: partes de un texto fijo, el orden es la identidad
        p.em ? <em key={i}>{p.text}</em> : <span key={i}>{p.text}</span>,
      )}
    </>
  );
}

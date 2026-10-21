import Link from "next/link";

/** Veces que se repiten los mensajes en cada mitad: con pocos, una sola vuelta no llena una pantalla ancha (2560+). */
const REPEAT = 3;

export function Announce({ items }: { items: string[] }) {
  const loop = Array.from({ length: REPEAT }, () => items).flat();
  return (
    <div className="announce" role="region" aria-label="Novedades">
      {/* la mitad es REPEAT veces más larga: la vuelta dura REPEAT veces más para no acelerar */}
      <div className="marquee" style={{ animationDuration: `${42 * REPEAT}s` }}>
        {[0, 1].map((k) => (
          <div key={k} aria-hidden={k ? true : undefined}>
            {loop.map((t, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: los mensajes se repiten y no se reordenan
              <span key={i} style={{ display: "contents" }}>
                {/* las repeticiones no se leen dos veces */}
                <span aria-hidden={i >= items.length ? true : undefined}>{t}</span>
                <i className="dot" />
              </span>
            ))}
          </div>
        ))}
      </div>
      {/* Res. SCI 424/2020: el botón de arrepentimiento, visible en la primera pantalla (quieto, fuera del marquee) */}
      <Link className="announce-legal" href="/arrepentimiento">
        Botón de arrepentimiento
      </Link>
    </div>
  );
}

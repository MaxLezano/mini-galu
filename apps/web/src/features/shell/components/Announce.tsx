import Link from "next/link";

export function Announce({ items }: { items: string[] }) {
  return (
    <div className="announce" role="region" aria-label="Novedades">
      <div className="marquee">
        {[0, 1].map((k) => (
          <div key={k} aria-hidden={k ? true : undefined}>
            {items.map((t) => (
              <span key={t} style={{ display: "contents" }}>
                <span>{t}</span>
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

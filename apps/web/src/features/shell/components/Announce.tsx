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
    </div>
  );
}

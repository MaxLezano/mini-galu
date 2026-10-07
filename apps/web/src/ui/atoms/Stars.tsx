const STAR = "m12 2.5 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9L12 2.5Z";

export function Stars({ n = 5, label }: { n?: number; label?: string }) {
  return (
    <span className="stars" role="img" aria-label={label ?? `${n} estrellas`}>
      {Array.from({ length: n }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: estrellas idénticas, el orden no cambia
        <svg key={i} viewBox="0 0 24 24" aria-hidden="true">
          <path d={STAR} />
        </svg>
      ))}
    </span>
  );
}

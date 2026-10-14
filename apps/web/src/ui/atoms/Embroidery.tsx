/**
 * Flor bordada (puntadas) para estados vacíos. Florece pétalo a pétalo con .bloom.is-drawn. Cada pétalo va girado
 * en un <g>: la animación le pone `transform` por CSS al path, y eso pisaría el giro si estuviera en el path.
 */
const PETALS = [0, 60, 120, 180, 240, 300];

export function Embroidery({ className = "emb" }: { className?: string }) {
  let k = 0;
  return (
    <svg
      className={className}
      viewBox="0 0 120 120"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <g strokeDasharray="3 4">
        {PETALS.map((r) => (
          <g key={r} transform={`rotate(${r} 60 46)`}>
            <path style={{ "--k": k++ } as React.CSSProperties} d="M60 44c-7-8-8-22 0-28 8 6 7 20 0 28Z" />
          </g>
        ))}
      </g>
      <circle
        style={{ "--k": k++ } as React.CSSProperties}
        cx="60"
        cy="46"
        r="5"
        fill="currentColor"
        stroke="none"
        opacity=".8"
      />
      <path
        style={{ "--k": k++ } as React.CSSProperties}
        strokeDasharray="3 4"
        d="M60 56c0 18 2 34 0 56M60 84c-8-8-18-10-24-6 6 8 16 10 24 6Z"
      />
      <path
        style={{ "--k": k++ } as React.CSSProperties}
        strokeDasharray="3 4"
        d="M60 96c8-8 18-9 24-5-6 8-16 9-24 5Z"
      />
    </svg>
  );
}

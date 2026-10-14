/**
 * Los trazos del foco de Mini Galú, calcados del dibujo a mano (filamento en forma de corazón). En orden de dibujo:
 * vidrio, borde de la rosca, corazón, rosca y destellos.
 */
export const FOCO_TRAZOS = [
  "M199 528c-12-30-56-80-82-126-26-46-28-110-4-163 28-62 94-110 176-110 94 0 168 56 180 134 10 66-28 120-70 165-28 30-46 64-52 100",
  "M199 530c50-3 100-4 150-6",
  "M266 524c-6-50-28-94-50-140-18-38-20-86 6-94 28-8 50 28 60 62 10-36 34-74 60-68 28 7 28 56 2 86-20 22-40 28-44 62-4 32-4 64-6 96",
  "M202 566c50-3 100-4 152 1M206 598c46-3 92-2 140 1M214 606c40 6 80 14 116 24-30 4-62 6-96 11 22 4 44 8 66 14",
  "M303 6c1 16 2 32 3 48M116 52c11 15 22 30 32 45M484 70c-11 12-22 24-32 35M7 211c16 3 32 7 47 12M535 236c16-4 32-9 48-14",
] as const;

/**
 * El foco: logo, ícono de Galú y firma. Son líneas de grosor parejo (`--foco-trazo`) que se dibujan solas al
 * aparecer y, al final, el corazón y los destellos titilan juntos (atelier.css). Las clases de CSS de los lugares donde va siguen siendo
 * `.bow` (las de los mockups).
 */
export function Foco({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`foco ${className}`.trim()}
      viewBox="-14 -14 619 682"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {FOCO_TRAZOS.map((d, i) => (
        <path key={d} d={d} pathLength={1} className={i === 2 ? "filamento" : undefined} />
      ))}
    </svg>
  );
}

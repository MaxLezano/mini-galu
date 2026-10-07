/** El moño de Mini Galú: logo, ícono de Galú y firma. Los pathLength permiten "atarlo" (clase .draw). */
export function Bow() {
  return (
    <svg
      viewBox="0 0 40 26"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path pathLength={1} d="M20 11C14 3 4 1 3 8s9 9 17 3Z" />
      <path pathLength={1} d="M20 11c6-8 16-10 17-3s-9 9-17 3Z" />
      <path pathLength={1} d="M18 12.5 13 24M22 12.5 27 24" />
      <circle cx="20" cy="11.2" r="2.6" fill="currentColor" />
    </svg>
  );
}

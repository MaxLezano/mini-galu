/**
 * El foco de Mini Galú (con el filamento en forma de corazón): logo, ícono de Galú y firma.
 * Los pathLength permiten "encenderlo" trazo a trazo (clase .draw). Las clases de CSS siguen siendo `.bow`
 * (las de los mockups).
 */
export function Foco() {
  return (
    <svg
      viewBox="0 0 40 46"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path pathLength={1} d="M15 33c-.6-4.6-7-7.6-7-16C8 10.2 13.3 6.5 20 6.5S32 10.2 32 17c0 8.4-6.4 11.4-7 16" />
      <path
        pathLength={1}
        d="M17.4 33c-.6-4.2-3.6-9-3.2-13.6.3-3.6 5.4-4 6 .4 1.2-3.2 6.2-2.6 5.6 1.2-.5 3.8-4.6 7-5.2 12"
      />
      <path pathLength={1} d="M14.5 34.5h11M15.2 37.2h9.6M16.2 39.9h7.6M18 42.6h4" />
      <path pathLength={1} d="M15.5 1.5 17 5M24.5 1.5 23.5 5M4 11.5l3.2 1.4M35.5 9.5l-3 1.8M33.5 19h3.5" />
    </svg>
  );
}

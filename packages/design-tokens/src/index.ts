/**
 * Tokens para usar desde TypeScript (mails, gráficos, OG images).
 * Deben coincidir con tokens.css — la fuente de verdad visual son los mockups.
 */
export const color = {
  paper: "#FBF8F3",
  paper2: "#FFFDF9",
  linen: "#F4EDE3",
  linen2: "#EADFD0",
  linen3: "#DCCDB9",
  cacao: "#3A2A22",
  cacao2: "#6E5A4E",
  cacao3: "#A08F83",
  canela: "#B0643E",
  canelaD: "#8E4A2A",
  canelaL: "#EFD6C5",
  salvia: "#8B9A7C",
  salviaD: "#5F6E52",
  salviaL: "#E1E6D8",
  rosa: "#E8C6BF",
  rosaL: "#F6E6E1",
  rojo: "#A3302B",
} as const;

export const font = {
  display: "Fraunces",
  ui: "Manrope",
  hand: "Caveat",
} as const;

export const breakpoints = {
  phone: 375,
  tablet: 820,
  desktop: 1440,
  ultrawide: 2560,
} as const;

export type ColorToken = keyof typeof color;

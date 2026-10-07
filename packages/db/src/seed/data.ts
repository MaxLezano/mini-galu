/**
 * Datos de arranque. Productos reales de Mini Galú (exportados del proyecto viejo, ver local-assets/legacy)
 * curados en la Fase 0 (design/mockups/assets/js/data.js): slugs, colecciones, ocasiones, colores y telas.
 * Fotos de prueba: local-assets/mockups/img (fuera del repo). En producción se cargan desde el panel.
 *
 * ⚠️ DEMO: reseñas, anotadas a listas de espera y al lanzamiento son de ejemplo para poder ver el panel con datos.
 */
import type { HomeBlock, Measures, Occasion, Size } from "@mini-galu/contracts";

export type SeedCollection = { slug: string; name: string; label: string; tagline: string; cover: string };

export const collections: SeedCollection[] = [
  {
    slug: "verano-2027",
    name: "Verano 2027",
    label: "Verano 2027",
    tagline: "Lino, volados y flores",
    cover: "elsa-1",
  },
  {
    slug: "fiestas",
    name: "Fiestas",
    label: "Fiestas y ceremonias",
    tagline: "Bautismos, cumples y Navidad",
    cover: "samanta-2",
  },
  { slug: "atemporal", name: "Atemporal", label: "Atemporal", tagline: "Para todos los días", cover: "cleo-1" },
  { slug: "accesorios", name: "Accesorios", label: "Accesorios", tagline: "Moños y vinchas", cover: "mono-verde" },
  {
    slug: "otono-invierno-26",
    name: "Otoño · Invierno 26",
    label: "Otoño · Invierno",
    tagline: "Pana, escocés y abrigo",
    cover: "hero-otono",
  },
];

export type SeedProduct = {
  slug: string;
  name: string;
  price: number; // pesos (se guardan en centavos)
  was?: number;
  col: string;
  occ: Occasion[];
  color: [string, string];
  photos: string[];
  sizes: Partial<Record<Size, number>>;
  waitlist: Partial<Record<Size, number>>;
  fabric: string;
  desc: string;
  tag?: string;
  accessory?: boolean;
  draft?: boolean;
  measures?: Partial<Record<Size, Measures>>;
  sold30: number;
};

/** Tabla genérica (mockup producto.html) para modelos sin medidas propias cargadas. */
export const DEFAULT_MEASURES: Record<Size, Measures> = {
  "12m": { largo: 42, axila: 26 },
  "2": { largo: 46, axila: 28 },
  "4": { largo: 50, axila: 30 },
  "6": { largo: 55, axila: 32 },
  "8": { largo: 60, axila: 34 },
  "10": { largo: 66, axila: 36 },
  Único: { largo: 45, ancho: 9 },
};

export const CARE =
  "Lavar a mano o en ciclo delicado con agua fría, del revés. No usar secarropas. Planchar a temperatura media evitando el bordado.";

export const products: SeedProduct[] = [
  {
    slug: "romantico-rojo",
    name: "Set Romántico Rojo",
    price: 38000,
    col: "fiestas",
    occ: ["fiesta", "navidad", "cumple"],
    color: ["Rojo", "#A3302B"],
    photos: ["romantico-rojo-1", "romantico-rojo-2", "romantico-rojo-3"],
    sizes: { "4": 0, "6": 0, "8": 3, "10": 2 },
    waitlist: { "4": 3, "6": 5 },
    fabric: "Lino lavado y algodón",
    desc: "Blusa romántica con cuello bordado a mano y falda jumper con bolsillos y tiradores de puntilla.",
    tag: "Nuevo",
    sold30: 9,
  },
  {
    slug: "maddie",
    name: "Set Maddie Bordado",
    price: 39000,
    col: "verano-2027",
    occ: ["diario", "cumple", "fiesta"],
    color: ["Beige", "#CDB79A"],
    photos: ["maddie-1", "maddie-2", "maddie-3", "maddie-4", "maddie-5"],
    sizes: { "4": 2, "6": 3, "8": 1 },
    waitlist: { "10": 2 },
    fabric: "Lino y puntilla de algodón",
    desc: "Blusa bordada con detalle de puntilla de algodón y jumper con tirador.",
    tag: "Nuevo",
    sold30: 7,
  },
  {
    slug: "samanta",
    name: "Vestido Samanta Plumeti",
    price: 47000,
    col: "fiestas",
    occ: ["fiesta", "bautismo", "casamiento", "comunion"],
    color: ["Blanco", "#F3EFE7"],
    photos: ["samanta-1", "samanta-2", "samanta-3"],
    sizes: { "6": 0, "8": 3, "10": 1 },
    waitlist: { "6": 6 },
    fabric: "Plumeti de algodón",
    desc: "Plumeti con volados de puntilla y alforzas en el pecho. Para los días que se recuerdan.",
    sold30: 6,
  },
  {
    slug: "catalina",
    name: "Vestido Catalina",
    price: 32000,
    col: "verano-2027",
    occ: ["fiesta", "navidad", "cumple"],
    color: ["Rojo", "#A3302B"],
    photos: ["catalina-1", "catalina-2", "catalina-3"],
    sizes: { "2": 3, "6": 1, "8": 1, "10": 0 },
    waitlist: { "10": 2 },
    fabric: "Gabardina liviana",
    desc: "Jumper rojo con cuello bebé bordado con margaritas. Incluye moño rojo.",
    tag: "Incluye moño",
    sold30: 5,
  },
  {
    slug: "catalina-rojo",
    name: "Vestido Catalina Bordado",
    price: 34000,
    col: "verano-2027",
    occ: ["diario", "navidad"],
    color: ["Rojo", "#B23A2E"],
    photos: ["catalina-rojo-1", "catalina-rojo-2"],
    sizes: { "6": 0, "8": 0, "10": 1 },
    waitlist: { "6": 4, "8": 3 },
    fabric: "Lino",
    desc: "Lino rojo con volados y ramo de margaritas bordado a mano. Amplio y fresco.",
    sold30: 4,
  },
  {
    slug: "cleo",
    name: "Vestido Cleo",
    price: 26900,
    was: 31900,
    col: "atemporal",
    occ: ["diario", "fiesta"],
    color: ["Crema", "#EFE6D6"],
    photos: ["cleo-1", "cleo-2", "cleo-3"],
    sizes: { "2": 0, "4": 3, "6": 2, "8": 1 },
    waitlist: { "2": 2 },
    fabric: "Lino natural",
    desc: "Lino crema con cuello bebé bordado con rosas rojas.",
    measures: {
      "2": { largo: 46, cintura: 28 },
      "4": { largo: 50, cintura: 30 },
      "6": { largo: 53, axila: 32 },
      "8": { largo: 58, axila: 34 },
    },
    sold30: 6,
  },
  {
    slug: "elsa",
    name: "Vestido Elsa",
    price: 28000,
    col: "verano-2027",
    occ: ["diario", "cumple"],
    color: ["Salvia", "#8B9A7C"],
    photos: ["elsa-1", "elsa-2"],
    sizes: { "2": 2, "4": 2, "6": 0 },
    waitlist: { "6": 3 },
    fabric: "Lino lavado",
    desc: "Lino salvia con volados, botones de madera y flores bordadas. Vincha a juego.",
    tag: "Con vincha",
    sold30: 5,
  },
  {
    slug: "rebeca",
    name: "Vestido Rebeca",
    price: 28000,
    col: "atemporal",
    occ: ["bautismo", "fiesta", "cumple"],
    color: ["Blanco", "#F7F3EC"],
    photos: ["rebeca-1", "rebeca-2"],
    sizes: { "12m": 1, "2": 2, "4": 0 },
    waitlist: { "4": 2 },
    fabric: "Algodón",
    desc: "Escote corazón, mangas globo y falda con mucho vuelo. Para girar.",
    sold30: 3,
  },
  {
    slug: "mariel",
    name: "Jumper Mariel Bordado",
    price: 28000,
    col: "fiestas",
    occ: ["navidad", "fiesta"],
    color: ["Rojo", "#A3302B"],
    photos: ["mariel-1", "mariel-2"],
    sizes: { "4": 1, "6": 1 },
    waitlist: {},
    fabric: "Gabardina y puntilla",
    desc: "Jumper con volados y cuello de puntilla bordado con rosas.",
    sold30: 4,
  },
  {
    slug: "mono-verde",
    name: "Moño Verde Largo",
    price: 2500,
    col: "accesorios",
    occ: ["diario", "fiesta", "regalo"],
    color: ["Verde", "#2F6B5A"],
    photos: ["mono-verde"],
    sizes: { Único: 15 },
    waitlist: {},
    fabric: "Lino",
    desc: "Moño largo de lino para trenzas y semirrecogidos.",
    accessory: true,
    sold30: 11,
  },
  {
    slug: "corazon-pana",
    name: "Jumper Corazón de Pana",
    price: 36000,
    col: "otono-invierno-26",
    occ: ["diario"],
    color: ["Canela", "#9A5A36"],
    photos: ["hero-bosque"],
    sizes: { "2": 0, "4": 0, "6": 0 },
    waitlist: { "2": 4, "4": 9, "6": 7 },
    fabric: "Pana fina",
    desc: "Jumper de pana con bolsillo corazón bordado con florcitas.",
    draft: true,
    sold30: 0,
  },
];

/** [autor, ciudad, producto, texto, talle] — mockup index.html ("Lo que dicen las familias"). */
export const featuredReviews: [string, string, string, string, Size | null][] = [
  [
    "Lucía F.",
    "CABA",
    "maddie",
    "Le quedó perfecto el talle 6 y el bordado es todavía más lindo en persona. Lo usó en su cumple y no se lo quería sacar.",
    "6",
  ],
  [
    "Mariana R.",
    "Mendoza",
    "rebeca",
    "Lo compré para el bautismo de mi hija y fue LA foto del día. Se nota la calidad de la tela.",
    "12m",
  ],
  [
    "Carla M.",
    "Rosario",
    "samanta",
    "Galú me ayudó a elegir el talle a las 11 de la noche y al otro día ya estaba despachado.",
    "10",
  ],
  [
    "Florencia D.",
    "CABA",
    "cleo",
    "El lino es suave y después de muchos lavados sigue igual. Ya vamos por el tercero.",
    "4",
  ],
  ["Camila T.", "Neuquén", "catalina", "Llegó rapidísimo a Neuquén. El moño que incluye es divino.", "8"],
  [
    "Julieta P.",
    "La Plata",
    "elsa",
    "Pedí el talle 4 por la tabla de medidas y le quedó justo. Las costuras por dentro son tan prolijas como por fuera.",
    "4",
  ],
  [
    "Graciela B.",
    "Córdoba",
    "romantico-rojo",
    "Se lo regalé a mi nieta con una gift card para que elija la mamá. Terminaron llevando dos.",
    "8",
  ],
  [
    "Agustina L.",
    "Mar del Plata",
    "mariel",
    "Las puntillas del cuello son un sueño. Me escribieron por WhatsApp apenas lo despacharon.",
    "4",
  ],
  [
    "Paula S.",
    "CABA",
    "catalina-rojo",
    "Retiré en el taller con turno, súper puntual, y Gaby nos mostró los bordados en persona.",
    "10",
  ],
  [
    "Romina V.",
    "Tucumán",
    "mono-verde",
    "Compré el moño verde para las fotos de su primer año y quedó hermoso. Tela suave, nada de picazón.",
    null,
  ],
  [
    "Daniela C.",
    "Salta",
    "cleo",
    "Pagué en 6 cuotas con la tarjeta y en 3 días lo tenía en Salta. Todo impecable.",
    "6",
  ],
];

/** [título, autor, meta talle, texto] — mockup producto.html. Se suman a cada prenda publicada. */
export const productReviews: [string, string, Size, string][] = [
  [
    "Divino y de excelente calidad",
    "Lucía F.",
    "6",
    "Le quedó perfecto. El bordado es todavía más lindo en persona y la tela no se arruga tanto.",
  ],
  [
    "La foto del cumple",
    "Romina P.",
    "4",
    "Lo usó para su cumple y todas preguntaban de dónde era. Llegó en 2 días a CABA.",
  ],
  ["Muy buena atención", "Valeria G.", "8", "Le pregunté a Galú por el talle y acertó. Lo volvería a comprar."],
];

export const launch = {
  title: "Otoño · Invierno 26",
  collection: "otono-invierno-26",
  startsAt: "2026-10-18T10:00:00-03:00",
  teaser:
    "Pana, escocés y lanas suaves. Salen pocas por talle: los anotados reciben el aviso una hora antes que en Instagram.",
  cover: "hero-otono",
  coverNote: "se viene el frío ♡",
  socialText:
    "Se viene Otoño · Invierno 26 🍂 Pana, escocés y lanas suaves. Anotate en la web y te avisamos una hora antes.",
  demoSignups: 214,
  /** Prendas que salen con el lanzamiento (en borrador hasta la fecha). */
  products: ["corazon-pana"],
};

/** Lanzamientos de ejemplo para el panel: uno anterior (ya publicado) y un borrador. */
export const otherLaunches = [
  {
    title: "Verano 2027",
    collection: "verano-2027",
    startsAt: "2026-09-12T10:00:00-03:00",
    teaser: "Linos lavados, volados y bordados de margaritas.",
    cover: "products/maddie-3.webp",
    coverNote: "lino y flores",
    status: "scheduled" as const,
    published: true,
    showCountdown: false,
    products: ["maddie", "elsa", "catalina"],
  },
  {
    title: "Navidad 26",
    collection: null,
    startsAt: "2026-11-29T10:00:00-03:00",
    teaser: "Rojos, terciopelo y moños grandes para las fiestas.",
    cover: "products/catalina-rojo-1.webp",
    coverNote: "para la foto del arbolito",
    status: "draft" as const,
    published: false,
    showCountdown: false,
    products: ["catalina"],
  },
];

export const home: HomeBlock = {
  announcements: [
    "Envíos a todo el país con Andreani",
    "Hasta 6 cuotas sin interés con Mercado Pago",
    "Diseños propios, bordados a mano",
    "Talles 12 meses a 10 años",
    "Envío gratis desde $90.000",
  ],
  hero: {
    eyebrow: "Otoño · Invierno 26",
    titleLines: ["Hecho a mano,", "para *crecer*", "*soñando.*"],
    lead: "Prendas de diseño para niñas de 12 meses a talle 10. Pocas de cada modelo, bordadas en nuestro taller.",
    ctaLabel: "Ver la colección",
    imagePath: "content/hero-campo.webp",
    imageAlt: "Nena con vestido lila y sombrero de paja en un campo",
  },
  featuredCollections: [
    { slug: "verano-2027", title: "Verano *2027*" },
    { slug: "fiestas", title: "*Fiestas* y ceremonias" },
    { slug: "otono-invierno-26", title: "Otoño · *Invierno*" },
  ],
  railSlugs: ["romantico-rojo", "maddie", "samanta", "catalina-rojo", "elsa", "cleo", "mariel", "rebeca", "catalina"],
  lookbook: [
    {
      imagePath: "content/hero-bosque.webp",
      alt: "Nena con jumper de pana en el bosque",
      caption: "Bosque de otoño",
      objectPosition: "48% 40%",
      productSlug: "corazon-pana",
    },
    {
      imagePath: "products/catalina-1.webp",
      alt: "Vestido Catalina rojo",
      caption: null,
      objectPosition: "50% 20%",
      productSlug: "catalina",
    },
    {
      imagePath: "products/elsa-1.webp",
      alt: "Vestido Elsa salvia",
      caption: null,
      objectPosition: "50% 30%",
      productSlug: "elsa",
    },
  ],
  instagram: {
    handle: "minigalumodainfantil",
    url: "https://www.instagram.com/minigalumodainfantil/",
    imagePaths: ["catalina-rojo-1", "mono-verde", "cleo-1", "maddie-4", "rebeca-2", "samanta-3"].map(
      (f) => `products/${f}.webp`,
    ),
  },
};

/** Imágenes que no son de producto (portada, lanzamiento, colecciones). */
export const contentImages = ["hero-campo", "hero-bosque", "hero-otono"];

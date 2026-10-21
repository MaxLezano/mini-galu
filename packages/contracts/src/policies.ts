import { z } from "zod";
import { type Cents, formatARS } from "./money";

/**
 * Ajustes de la tienda que Gaby edita en "Tienda y pagos" (días de cambio, envío gratis, formas de entrega, cadete,
 * horarios de retiro, gift cards, contacto y taller). Los lee la API (checkout, ayuda, Galú, mails) y la tienda
 * (ficha, bolsa, inicio). Sin nada guardado rige `DEFAULT_POLICIES`. Los precios de Andreani salen de Andreani.
 */

/* ------------------------------------------------------------------ cadete (códigos postales) */

/** Códigos postales como los escribe Gaby: "4000, 4107-4109". null si no se entiende. */
export function parseCpRanges(text: string): [number, number][] | null {
  const t = text.trim();
  if (!t) return [];
  const out: [number, number][] = [];
  for (const part of t.split(/\s*[,;]\s*|\s+y\s+/)) {
    const m = /^(\d{4})(?:\s*(?:-|–|a)\s*(\d{4}))?$/.exec(part.trim());
    if (!m) return null;
    const from = Number(m[1]);
    const to = Number(m[2] ?? m[1]);
    if (from > to) return null;
    out.push([from, to]);
  }
  return out;
}

const cpOf = (postalCode: string) => Number.parseInt(postalCode.replace(/\D/g, "").slice(0, 4), 10);
const inRanges = (postalCode: string, text: string) => {
  const cp = cpOf(postalCode);
  return !Number.isNaN(cp) && (parseCpRanges(text) ?? []).some(([from, to]) => cp >= from && cp <= to);
};

const cents = (msg: string) => z.number({ error: msg }).int(msg).min(0, msg).max(10_000_000_00, "Es un monto muy alto");
const cpRanges = z
  .string()
  .trim()
  .max(200, "Escribilo más corto")
  .refine((s) => parseCpRanges(s) !== null, "Escribí los códigos postales así: 4000-4199, 4700");

/** Cadete propio en la ciudad del taller: a qué códigos postales llega y desde cuánto sale (no se cobra en la web). */
export const LocalDeliverySchema = z.object({
  cps: cpRanges,
  fromCents: cents("Poné desde cuánto sale"),
});
export type LocalDelivery = z.infer<typeof LocalDeliverySchema>;

/* ------------------------------------------------------------------ contacto y taller */

export const StoreContactSchema = z.object({
  /** Como lo escribe Gaby: "381 319-5264" o "+54 9 381 319-5264". */
  whatsapp: z
    .string()
    .trim()
    .regex(/^\+?[\d\s()-]{8,20}$/, "Escribí el WhatsApp con característica (ej. 381 319-5264)"),
  email: z.string().trim().pipe(z.email("Revisá el email")),
  /** Usuario de Instagram, sin @. */
  instagram: z
    .string()
    .trim()
    .min(1, "Poné el usuario de Instagram")
    .max(60)
    .regex(/^[\w.]+$/, "Poné solo el usuario, sin @ ni link"),
});
export type StoreContact = z.infer<typeof StoreContactSchema>;

/** wa.me del número de la tienda (un celular argentino de 10 dígitos lleva el 549 adelante). */
export function whatsappUrl(phone: string, text?: string): string {
  const digits = phone.replace(/\D/g, "");
  const full = digits.length === 10 ? `549${digits}` : digits;
  return `https://wa.me/${full}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export const instagramUrl = (user: string) => `https://www.instagram.com/${user}/`;

export const WorkshopSchema = z.object({
  city: z.string().trim().min(1, "Poné la localidad del taller").max(40, "Escribilo más corto"),
  province: z.string().trim().min(1, "Poné la provincia del taller").max(40, "Escribilo más corto"),
});
export type Workshop = z.infer<typeof WorkshopSchema>;

/** "San Miguel de Tucumán, Tucumán" */
export const workshopPlace = (w: Workshop) => `${w.city}, ${w.province}`;

/**
 * Datos fiscales de Gaby (monotributista): van impresos en cada factura. El CUIT y el punto de venta no se cargan
 * acá: son los del certificado de ARCA (`ARCA_CUIT`, `ARCA_PUNTO_VENTA` en el .env).
 */
export const StoreFiscalSchema = z.object({
  /** Nombre y apellido o razón social, como figura en ARCA. */
  name: z.string().trim().max(80, "Escribilo más corto"),
  /** Domicilio comercial. */
  address: z.string().trim().max(120, "Escribilo más corto"),
  /** Ingresos Brutos: número de inscripción (o "Exento"). */
  iibb: z.string().trim().max(30, "Escribilo más corto"),
  /** Inicio de actividades (AAAA-MM-DD). */
  activitiesSince: z
    .string()
    .trim()
    .regex(/^(\d{4}-\d{2}-\d{2})?$/, "Elegí la fecha de inicio de actividades"),
});
export type StoreFiscal = z.infer<typeof StoreFiscalSchema>;

const hour = z.number().int().min(0).max(24);
/** Franjas de retiro de un día: [[10, 13], [16, 19]]. */
export const PickupDaySchema = z
  .array(z.tuple([hour, hour]).refine(([from, to]) => from < to, "Cada franja termina después de que empieza"))
  .max(4, "Hasta 4 franjas por día");

const points = (what: string, min: number, max: number) =>
  z
    .number({ error: `Poné ${what}` })
    .int("Poné un número entero")
    .min(min, `Al menos ${min}`)
    .max(max, `Hasta ${max}`);

/**
 * Puntos por reseñas: cada reseña publicada suma (más con foto) y con `threshold` puntos el cliente canjea un
 * cupón personal de `percent`% que vale `validDays` días. Solo reseñas: las compras no suman.
 */
export const ReviewPointsSchema = z.object({
  enabled: z.boolean(),
  perReview: points("los puntos por reseña", 1, 1000),
  perPhoto: points("los puntos extra por la foto", 0, 1000),
  threshold: points("los puntos para canjear", 1, 10_000),
  percent: points("el descuento", 1, 50),
  validDays: points("los días que vale el cupón", 7, 365),
});
export type ReviewPoints = z.infer<typeof ReviewPointsSchema>;

export const StorePoliciesSchema = z
  .object({
    /** Días desde que se recibe el pedido para cambiar el talle. */
    exchangeDays: z
      .number({ error: "Poné los días para cambiar" })
      .int("Poné un número de días")
      .min(1, "Al menos 1 día")
      .max(90, "Hasta 90 días"),
    freeShipping: z.object({ enabled: z.boolean(), fromCents: cents("Poné desde qué monto").min(1, "Poné un monto") }),
    /**
     * Formas de entrega prendidas. Andreani (domicilio y sucursal) cotiza con Andreani; "acordar" y "cadete" se
     * coordinan por WhatsApp y no se cobran en la web.
     */
    methods: z.object({
      domicilio: z.boolean(),
      sucursal: z.boolean(),
      acordar: z.boolean(),
      taller: z.boolean(),
      cadete: z.boolean(),
    }),
    localDelivery: LocalDeliverySchema,
    /** Franjas de retiro en el taller por día de la semana (0 = domingo). */
    pickupHours: z.array(PickupDaySchema).length(7),
    /** Meses que vale una gift card desde que se activa. */
    giftcardMonths: z
      .number({ error: "Poné cuántos meses vale" })
      .int("Poné un número de meses")
      .min(1, "Al menos 1 mes")
      .max(24, "Hasta 24 meses"),
    contact: StoreContactSchema,
    workshop: WorkshopSchema,
    fiscal: StoreFiscalSchema,
    reviewPoints: ReviewPointsSchema,
  })
  .refine((p) => Object.values(p.methods).some(Boolean), {
    message: "Dejá al menos una forma de entrega",
    path: ["methods"],
  })
  .refine((p) => !p.methods.cadete || (parseCpRanges(p.localDelivery.cps) ?? []).length > 0, {
    message: "Poné los códigos postales de la cadetería",
    path: ["localDelivery", "cps"],
  })
  .refine((p) => !p.methods.taller || p.pickupHours.some((d) => d.length > 0), {
    message: "Poné al menos un horario de retiro",
    path: ["pickupHours"],
  });
export type StorePolicies = z.infer<typeof StorePoliciesSchema>;
/** Lo que manda una caja del panel: solo sus campos (el resto queda como estaba). */
export const StorePoliciesInputSchema = z.record(z.string(), z.unknown());
export type StorePoliciesInput = Partial<StorePolicies>;

const WEEKDAY: [number, number][] = [
  [10, 13],
  [16, 19],
];

export const DEFAULT_POLICIES: StorePolicies = {
  exchangeDays: 2,
  freeShipping: { enabled: false, fromCents: 90_000_00 },
  methods: { domicilio: true, sucursal: true, acordar: true, taller: true, cadete: true },
  localDelivery: { cps: "4000", fromCents: 3_000_00 },
  pickupHours: [[], WEEKDAY, WEEKDAY, WEEKDAY, WEEKDAY, WEEKDAY, [[10, 13]]],
  giftcardMonths: 2,
  contact: { whatsapp: "381 319-5264", email: "mini.galu.store@gmail.com", instagram: "minigalumodainfantil" },
  workshop: { city: "San Miguel de Tucumán", province: "Tucumán" },
  fiscal: { name: "", address: "", iibb: "", activitiesSince: "" },
  // unas 5 prendas reseñadas con foto para un 10%
  reviewPoints: { enabled: true, perReview: 10, perPhoto: 10, threshold: 100, percent: 10, validDays: 60 },
};

type Saved = Partial<StorePolicies> & {
  methods?: Partial<StorePolicies["methods"]>;
  localDelivery?: Partial<StorePolicies["localDelivery"]> & { enabled?: boolean };
};

/**
 * Lo guardado antes de que existiera cada ajuste se completa con la base. Las tablas de precios por zona que hubo
 * antes (AMBA · Centro · Resto y Tucumán · Noroeste · Resto) se descartan: Andreani cotiza con sus precios.
 */
export function withDefaults(saved: unknown): StorePolicies {
  const { rates: _rates, zones: _zones, ...rest } = (saved ?? {}) as Saved & { rates?: unknown; zones?: unknown };
  const { enabled, ...local } = rest.localDelivery ?? {};
  return {
    ...DEFAULT_POLICIES,
    ...rest,
    methods: {
      ...DEFAULT_POLICIES.methods,
      ...(enabled === undefined ? {} : { cadete: enabled }),
      ...rest.methods,
    },
    localDelivery: { ...DEFAULT_POLICIES.localDelivery, ...local },
  };
}

/** El cadete si llega a ese CP (null: no está prendido o el CP no es de la ciudad). */
export function localDeliveryFor(p: StorePolicies, postalCode: string): LocalDelivery | null {
  return p.methods.cadete && inRanges(postalCode, p.localDelivery.cps) ? p.localDelivery : null;
}

/**
 * Las formas de entrega prendidas en una frase, igual en la ficha, la ayuda y Galú: "Envíos a todo el país con
 * Andreani (a domicilio o a sucursal), envío a acordar por WhatsApp, cadete en San Miguel de Tucumán desde $3.000 o
 * retiro gratis en el taller."
 */
export function deliverySummary(p: StorePolicies): string {
  const { methods: m } = p;
  const andreani = [m.domicilio && "a domicilio", m.sucursal && "a sucursal"].filter(Boolean).join(" o ");
  const parts = [
    andreani && `envíos a todo el país con Andreani (${andreani})`,
    m.acordar && "envío a acordar por WhatsApp",
    m.cadete && `cadete en ${p.workshop.city} desde ${formatARS(p.localDelivery.fromCents)}`,
    m.taller && `retiro gratis en el taller de ${p.workshop.city}`,
  ].filter((x): x is string => !!x);
  const text = parts.length > 1 ? `${parts.slice(0, -1).join(", ")} o ${parts.at(-1)}` : (parts[0] ?? "");
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}.`;
}

/** Desde qué monto el envío es gratis (null: no hay envío gratis). */
export function freeShippingFrom(p: StorePolicies): Cents | null {
  return p.freeShipping.enabled ? p.freeShipping.fromCents : null;
}

export function qualifiesForFreeShipping(p: StorePolicies, subtotalCents: Cents): boolean {
  const from = freeShippingFrom(p);
  return from !== null && subtotalCents >= from;
}

/** "Envío gratis desde $90.000" (null si no hay envío gratis). */
export function freeShippingLabel(p: StorePolicies): string | null {
  const from = freeShippingFrom(p);
  return from === null ? null : `Envío gratis desde ${formatARS(from)}`;
}

/* ------------------------------------------------------------------ horarios de retiro */

export const WEEKDAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"] as const;

/** [[10, 13], [16, 19]] → "10 a 13, 16 a 19" (vacío: cerrado). */
export function formatPickupDay(day: [number, number][]): string {
  return day.map(([from, to]) => `${from} a ${to}`).join(", ");
}

/** "10 a 13, 16-19" → [[10, 13], [16, 19]]; "" → [] (cerrado); null si no se entiende. */
export function parsePickupDay(text: string): [number, number][] | null {
  const t = text.trim();
  if (!t) return [];
  const out: [number, number][] = [];
  for (const part of t.split(/\s*(?:,|;|\by\b)\s*/)) {
    const m = /^\s*(\d{1,2})(?:[:.]00)?\s*(?:a|-|–)\s*(\d{1,2})(?:[:.]00)?\s*(?:h|hs)?\s*$/i.exec(part);
    if (!m) return null;
    const from = Number(m[1]);
    const to = Number(m[2]);
    if (to > 24 || from >= to) return null;
    out.push([from, to]);
  }
  return out;
}

/** "Lun a vie · 10 a 13 y 16 a 19 h · Sáb · 10 a 13 h": agrupa los días seguidos con las mismas franjas. */
export function pickupHoursLabel(p: StorePolicies): string {
  const short = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const order = [1, 2, 3, 4, 5, 6, 0];
  const groups: { days: number[]; hours: string }[] = [];
  for (const d of order) {
    const day = p.pickupHours[d] ?? [];
    if (!day.length) continue;
    const hours = `${day.map(([f, t]) => `${f} a ${t}`).join(" y ")} h`;
    const last = groups[groups.length - 1];
    const prev = last?.days[last.days.length - 1];
    if (last && last.hours === hours && prev !== undefined && order.indexOf(prev) === order.indexOf(d) - 1)
      last.days.push(d);
    else groups.push({ days: [d], hours });
  }
  return groups
    .map((g) => {
      const first = short[g.days[0] ?? 0] ?? "";
      const name =
        g.days.length === 1 ? first : `${first} a ${(short[g.days[g.days.length - 1] ?? 0] ?? "").toLowerCase()}`;
      return `${name} · ${g.hours}`;
    })
    .join(" · ");
}

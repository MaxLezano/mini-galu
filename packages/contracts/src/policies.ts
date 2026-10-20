import { z } from "zod";
import { type Cents, formatARS } from "./money";

/**
 * Políticas de la tienda que Gaby edita en "Tienda y pagos" (días de cambio, envío gratis, formas de entrega,
 * tarifas por zona y horarios de retiro). Las lee la API (checkout, ayuda, Galú, mails) y la tienda (ficha, bolsa,
 * inicio). Sin nada guardado rige `DEFAULT_POLICIES`, que es lo que la tienda decía hasta que se pudo editar.
 */

/* ------------------------------------------------------------------ zonas de envío (sin Andreani conectado) */

/**
 * Rangos de CP de una zona como los escribe Gaby: "4000-4199, 5300 a 5399, 4700". null si no se entiende.
 * Vacío = sin rangos (la última zona toma todo lo que no entra en las otras).
 */
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

export const ShippingZoneSchema = z.object({
  /** "Tucumán", "Noroeste", "Resto del país". */
  title: z.string().trim().min(1, "Poné el nombre de la zona").max(40, "Escribilo más corto"),
  /** Códigos postales de la zona; la última zona no lleva (es el resto del país). */
  cps: cpRanges,
  domicilioCents: cents("Poné el precio a domicilio"),
  sucursalCents: cents("Poné el precio a sucursal"),
  /** Días hábiles que tarda: "2 a 3". */
  days: z.string().trim().min(1, "Poné cuántos días tarda").max(20, "Escribilo más corto"),
});
export type ShippingZone = z.infer<typeof ShippingZoneSchema>;

/** Cadetería propia en la ciudad del taller: precio desde y se coordina por WhatsApp (no se cobra en la web). */
export const LocalDeliverySchema = z.object({
  enabled: z.boolean(),
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

const hour = z.number().int().min(0).max(24);
/** Franjas de retiro de un día: [[10, 13], [16, 19]]. */
export const PickupDaySchema = z
  .array(z.tuple([hour, hour]).refine(([from, to]) => from < to, "Cada franja termina después de que empieza"))
  .max(4, "Hasta 4 franjas por día");

export const StorePoliciesSchema = z
  .object({
    /** Días desde que se recibe el pedido para cambiar el talle. */
    exchangeDays: z
      .number({ error: "Poné los días para cambiar" })
      .int("Poné un número de días")
      .min(1, "Al menos 1 día")
      .max(90, "Hasta 90 días"),
    freeShipping: z.object({ enabled: z.boolean(), fromCents: cents("Poné desde qué monto").min(1, "Poné un monto") }),
    methods: z.object({ domicilio: z.boolean(), sucursal: z.boolean(), taller: z.boolean() }),
    /** Tabla de envío por zona (la usa la tienda cuando Andreani no está conectado). */
    zones: z.array(ShippingZoneSchema).min(1).max(6),
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
  })
  .refine((p) => p.methods.domicilio || p.methods.sucursal || p.methods.taller, {
    message: "Dejá al menos una forma de entrega",
    path: ["methods"],
  })
  .refine((p) => !p.localDelivery.enabled || (parseCpRanges(p.localDelivery.cps) ?? []).length > 0, {
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
  methods: { domicilio: true, sucursal: true, taller: true },
  zones: [
    { title: "Tucumán", cps: "4000-4199", domicilioCents: 5_900_00, sucursalCents: 4_248_00, days: "2 a 3" },
    {
      title: "Noroeste",
      cps: "4200-4799, 5300-5399",
      domicilioCents: 7_400_00,
      sucursalCents: 5_328_00,
      days: "4 a 6",
    },
    { title: "Resto del país", cps: "", domicilioCents: 8_900_00, sucursalCents: 6_408_00, days: "4 a 6" },
  ],
  localDelivery: { enabled: true, cps: "4000", fromCents: 3_000_00 },
  pickupHours: [[], WEEKDAY, WEEKDAY, WEEKDAY, WEEKDAY, WEEKDAY, [[10, 13]]],
  giftcardMonths: 2,
  contact: { whatsapp: "381 319-5264", email: "mini.galu.store@gmail.com", instagram: "minigalumodainfantil" },
  workshop: { city: "San Miguel de Tucumán", province: "Tucumán" },
};

type OldRates = Record<"amba" | "centro" | "resto", { domicilioCents: number; sucursalCents: number; days: string }>;

/**
 * Lo guardado antes de que existiera cada ajuste se completa con la base (contacto, taller, gift cards, cadete). La
 * tabla vieja de zonas fijas (AMBA · Centro · Resto, pensada para un taller en CABA) pasa a las zonas nuevas con los
 * mismos precios: la más barata a Tucumán, la del medio al Noroeste y la más cara al resto del país.
 */
export function withDefaults(saved: unknown): StorePolicies {
  const { rates, ...rest } = (saved ?? {}) as Partial<StorePolicies> & { rates?: OldRates };
  const old = ["amba", "centro", "resto"] as const;
  const zones =
    rest.zones ??
    (rates ? DEFAULT_POLICIES.zones.map((z, i) => ({ ...z, ...rates[old[i] ?? "resto"] })) : DEFAULT_POLICIES.zones);
  return { ...DEFAULT_POLICIES, ...rest, zones };
}

/** La zona de un CP: la primera cuyos rangos lo incluyen; si ninguna, la última (resto del país). */
export function zoneOf(p: StorePolicies, postalCode: string): ShippingZone {
  const last = p.zones[p.zones.length - 1] as ShippingZone;
  return p.zones.slice(0, -1).find((z) => inRanges(postalCode, z.cps)) ?? last;
}

/** La cadetería si llega a ese CP (null: no está prendida o el CP no es de la zona). */
export function localDeliveryFor(p: StorePolicies, postalCode: string): LocalDelivery | null {
  return p.localDelivery.enabled && inRanges(postalCode, p.localDelivery.cps) ? p.localDelivery : null;
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

/** Precio de lista de la tabla por zona (sin envío gratis). */
export function zoneQuote(p: StorePolicies, postalCode: string) {
  const r = zoneOf(p, postalCode);
  return {
    domicilio: { cents: r.domicilioCents, detail: `Llega en ${r.days} días hábiles` },
    sucursal: {
      cents: r.sucursalCents,
      detail: "Te confirmamos la sucursal Andreani más cercana a tu CP antes de despachar",
    },
  };
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

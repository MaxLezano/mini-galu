import { z } from "zod";
import { type Cents, formatARS } from "./money";

/**
 * Políticas de la tienda que Gaby edita en "Tienda y pagos" (días de cambio, envío gratis, formas de entrega,
 * tarifas por zona y horarios de retiro). Las lee la API (checkout, ayuda, Galú, mails) y la tienda (ficha, bolsa,
 * inicio). Sin nada guardado rige `DEFAULT_POLICIES`, que es lo que la tienda decía hasta que se pudo editar.
 */

/** Zonas de la tabla de envío, por código postal. */
export const SHIPPING_ZONES = ["amba", "centro", "resto"] as const;
export type ShippingZone = (typeof SHIPPING_ZONES)[number];
export const ZONE_LABELS: Record<ShippingZone, { title: string; cp: string }> = {
  amba: { title: "AMBA", cp: "CP hasta 1899" },
  centro: { title: "Centro", cp: "CP 1900 a 4999" },
  resto: { title: "Resto del país", cp: "CP 5000 en adelante" },
};

/** "C1414" o "1414" → zona. Un CP que no se entiende cae en la más cara. */
export function zoneOf(postalCode: string): ShippingZone {
  const cp = Number.parseInt(postalCode.replace(/\D/g, ""), 10) || 9999;
  return cp < 1900 ? "amba" : cp < 5000 ? "centro" : "resto";
}

const cents = (msg: string) => z.number({ error: msg }).int(msg).min(0, msg).max(10_000_000_00, "Es un monto muy alto");

export const ZoneRateSchema = z.object({
  domicilioCents: cents("Poné el precio a domicilio"),
  sucursalCents: cents("Poné el precio a sucursal"),
  /** Días hábiles que tarda: "2 a 3". */
  days: z.string().trim().min(1, "Poné cuántos días tarda").max(20, "Escribilo más corto"),
});
export type ZoneRate = z.infer<typeof ZoneRateSchema>;

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
    rates: z.object({ amba: ZoneRateSchema, centro: ZoneRateSchema, resto: ZoneRateSchema }),
    /** Franjas de retiro en el taller por día de la semana (0 = domingo). */
    pickupHours: z.array(PickupDaySchema).length(7),
  })
  .refine((p) => p.methods.domicilio || p.methods.sucursal || p.methods.taller, {
    message: "Dejá al menos una forma de entrega",
    path: ["methods"],
  })
  .refine((p) => !p.methods.taller || p.pickupHours.some((d) => d.length > 0), {
    message: "Poné al menos un horario de retiro",
    path: ["pickupHours"],
  });
export type StorePolicies = z.infer<typeof StorePoliciesSchema>;

/** El taller: retiro de pedidos y origen de los envíos (la dirección exacta está en Tienda y pagos → Envíos). */
export const WORKSHOP = { city: "San Miguel de Tucumán", province: "Tucumán" } as const;
/** "San Miguel de Tucumán, Tucumán" */
export const WORKSHOP_PLACE = `${WORKSHOP.city}, ${WORKSHOP.province}`;

const WEEKDAY: [number, number][] = [
  [10, 13],
  [16, 19],
];

export const DEFAULT_POLICIES: StorePolicies = {
  exchangeDays: 2,
  freeShipping: { enabled: false, fromCents: 90_000_00 },
  methods: { domicilio: true, sucursal: true, taller: true },
  rates: {
    amba: { domicilioCents: 5_900_00, sucursalCents: 4_248_00, days: "2 a 3" },
    centro: { domicilioCents: 7_400_00, sucursalCents: 5_328_00, days: "4 a 6" },
    resto: { domicilioCents: 8_900_00, sucursalCents: 6_408_00, days: "4 a 6" },
  },
  pickupHours: [[], WEEKDAY, WEEKDAY, WEEKDAY, WEEKDAY, WEEKDAY, [[10, 13]]],
};

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
  const r = p.rates[zoneOf(postalCode)];
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

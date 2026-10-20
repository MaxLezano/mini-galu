import { formatPickupDay, parsePickupDay, type StorePolicies, StorePoliciesSchema } from "@mini-galu/contracts";

type ZoneForm = { title: string; cps: string; domicilio: string; sucursal: string; days: string };

/** Lo que se escribe en el formulario: montos en pesos y franjas como texto ("10 a 13, 16 a 19"). */
export type PoliciesForm = {
  exchangeDays: string;
  freeEnabled: boolean;
  freeFrom: string;
  methods: StorePolicies["methods"];
  zones: ZoneForm[];
  local: { enabled: boolean; cps: string; from: string };
  /** Una por día de la semana (0 = domingo). */
  pickup: string[];
};

/** Lo que guarda "Entregas y cambios" (el resto de los ajustes lo guardan sus cajas). */
export type DeliveryPolicies = Pick<
  StorePolicies,
  "exchangeDays" | "freeShipping" | "methods" | "zones" | "localDelivery" | "pickupHours"
>;

export const pesos = (cents: number) => String(Math.round(cents / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
/** "90.000" → 9000000 centavos; NaN si no hay número. */
export const cents = (text: string) => {
  const digits = text.replace(/\D/g, "");
  return digits ? Number(digits) * 100 : Number.NaN;
};

export function toForm(p: StorePolicies): PoliciesForm {
  return {
    exchangeDays: String(p.exchangeDays),
    freeEnabled: p.freeShipping.enabled,
    freeFrom: pesos(p.freeShipping.fromCents),
    methods: { ...p.methods },
    zones: p.zones.map((z) => ({
      title: z.title,
      cps: z.cps,
      domicilio: pesos(z.domicilioCents),
      sucursal: pesos(z.sucursalCents),
      days: z.days,
    })),
    local: {
      enabled: p.localDelivery.enabled,
      cps: p.localDelivery.cps,
      from: pesos(p.localDelivery.fromCents),
    },
    pickup: p.pickupHours.map(formatPickupDay),
  };
}

const ZONE_FIELD: Record<string, string> = {
  title: "title",
  cps: "cps",
  domicilioCents: "domicilio",
  sucursalCents: "sucursal",
  days: "days",
};

/**
 * El formulario como ajustes (se valida con los demás ajustes de `base`), o el primer problema con el id del campo
 * para llevar el foco.
 */
export function fromForm(
  f: PoliciesForm,
  base: StorePolicies,
): { policies: DeliveryPolicies } | { field: string; message: string } {
  const pickupHours: [number, number][][] = [];
  for (const [i, text] of f.pickup.entries()) {
    const day = parsePickupDay(text);
    if (!day) return { field: `pol-pickup-${i}`, message: "Escribí las franjas así: 10 a 13, 16 a 19" };
    pickupHours.push(day);
  }
  const candidate = {
    ...base,
    exchangeDays: Number(f.exchangeDays.trim() || Number.NaN),
    freeShipping: { enabled: f.freeEnabled, fromCents: cents(f.freeFrom) },
    methods: f.methods,
    zones: f.zones.map((z, i) => ({
      title: z.title,
      // la última zona es el resto del país: no lleva códigos postales
      cps: i === f.zones.length - 1 ? "" : z.cps,
      domicilioCents: cents(z.domicilio),
      sucursalCents: cents(z.sucursal),
      days: z.days,
    })),
    localDelivery: { enabled: f.local.enabled, cps: f.local.cps, fromCents: cents(f.local.from) },
    pickupHours,
  };
  const r = StorePoliciesSchema.safeParse(candidate);
  if (r.success) {
    const { exchangeDays, freeShipping, methods, zones, localDelivery } = r.data;
    return { policies: { exchangeDays, freeShipping, methods, zones, localDelivery, pickupHours: r.data.pickupHours } };
  }
  const issue = r.error.issues[0];
  const path = issue?.path ?? [];
  const field =
    path[0] === "exchangeDays"
      ? "pol-days"
      : path[0] === "freeShipping"
        ? "pol-free"
        : path[0] === "zones"
          ? `pol-zone-${String(path[1])}-${ZONE_FIELD[String(path[2])] ?? "title"}`
          : path[0] === "localDelivery"
            ? path[1] === "fromCents"
              ? "pol-local-from"
              : "pol-local-cps"
            : path[0] === "pickupHours"
              ? "pol-pickup-1"
              : "pol-domicilio";
  return { field, message: issue?.message ?? "Revisá los datos" };
}

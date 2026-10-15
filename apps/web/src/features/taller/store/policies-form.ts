import {
  formatPickupDay,
  parsePickupDay,
  SHIPPING_ZONES,
  type ShippingZone,
  type StorePolicies,
  StorePoliciesSchema,
} from "@mini-galu/contracts";

/** Lo que se escribe en el formulario: montos en pesos y franjas como texto ("10 a 13, 16 a 19"). */
export type PoliciesForm = {
  exchangeDays: string;
  freeEnabled: boolean;
  freeFrom: string;
  methods: StorePolicies["methods"];
  rates: Record<ShippingZone, { domicilio: string; sucursal: string; days: string }>;
  /** Una por día de la semana (0 = domingo). */
  pickup: string[];
};

const pesos = (cents: number) => String(Math.round(cents / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
/** "90.000" → 9000000 centavos; NaN si no hay número. */
const cents = (text: string) => {
  const digits = text.replace(/\D/g, "");
  return digits ? Number(digits) * 100 : Number.NaN;
};

export function toForm(p: StorePolicies): PoliciesForm {
  return {
    exchangeDays: String(p.exchangeDays),
    freeEnabled: p.freeShipping.enabled,
    freeFrom: pesos(p.freeShipping.fromCents),
    methods: { ...p.methods },
    rates: Object.fromEntries(
      SHIPPING_ZONES.map((z) => [
        z,
        {
          domicilio: pesos(p.rates[z].domicilioCents),
          sucursal: pesos(p.rates[z].sucursalCents),
          days: p.rates[z].days,
        },
      ]),
    ) as PoliciesForm["rates"],
    pickup: p.pickupHours.map(formatPickupDay),
  };
}

/** El formulario como políticas, o el primer problema con el id del campo para llevar el foco. */
export function fromForm(f: PoliciesForm): { policies: StorePolicies } | { field: string; message: string } {
  const pickupHours: [number, number][][] = [];
  for (const [i, text] of f.pickup.entries()) {
    const day = parsePickupDay(text);
    if (!day) return { field: `pol-pickup-${i}`, message: "Escribí las franjas así: 10 a 13, 16 a 19" };
    pickupHours.push(day);
  }
  const candidate = {
    exchangeDays: Number(f.exchangeDays.trim() || Number.NaN),
    freeShipping: { enabled: f.freeEnabled, fromCents: cents(f.freeFrom) },
    methods: f.methods,
    rates: Object.fromEntries(
      SHIPPING_ZONES.map((z) => [
        z,
        {
          domicilioCents: cents(f.rates[z].domicilio),
          sucursalCents: cents(f.rates[z].sucursal),
          days: f.rates[z].days,
        },
      ]),
    ),
    pickupHours,
  };
  const r = StorePoliciesSchema.safeParse(candidate);
  if (r.success) return { policies: r.data };
  const issue = r.error.issues[0];
  const path = issue?.path ?? [];
  const field =
    path[0] === "exchangeDays"
      ? "pol-days"
      : path[0] === "freeShipping"
        ? "pol-free"
        : path[0] === "rates"
          ? `pol-${String(path[1])}-${path[2] === "domicilioCents" ? "domicilio" : path[2] === "sucursalCents" ? "sucursal" : "days"}`
          : path[0] === "pickupHours"
            ? "pol-pickup-1"
            : "pol-domicilio";
  return { field, message: issue?.message ?? "Revisá los datos" };
}

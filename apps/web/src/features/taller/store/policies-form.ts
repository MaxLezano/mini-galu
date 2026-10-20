import { formatPickupDay, parsePickupDay, type StorePolicies, StorePoliciesSchema } from "@mini-galu/contracts";

/** Lo que se escribe en el formulario: montos en pesos y franjas como texto ("10 a 13, 16 a 19"). */
export type PoliciesForm = {
  exchangeDays: string;
  freeEnabled: boolean;
  freeFrom: string;
  methods: StorePolicies["methods"];
  local: { cps: string; from: string };
  /** Una por día de la semana (0 = domingo). */
  pickup: string[];
};

/** Lo que guarda "Entregas y cambios" (el resto de los ajustes lo guardan sus cajas). */
export type DeliveryPolicies = Pick<
  StorePolicies,
  "exchangeDays" | "freeShipping" | "methods" | "localDelivery" | "pickupHours"
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
    local: {
      cps: p.localDelivery.cps,
      from: pesos(p.localDelivery.fromCents),
    },
    pickup: p.pickupHours.map(formatPickupDay),
  };
}

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
    localDelivery: { cps: f.local.cps, fromCents: cents(f.local.from) },
    pickupHours,
  };
  const r = StorePoliciesSchema.safeParse(candidate);
  if (r.success) {
    const { exchangeDays, freeShipping, methods, localDelivery } = r.data;
    return { policies: { exchangeDays, freeShipping, methods, localDelivery, pickupHours: r.data.pickupHours } };
  }
  const issue = r.error.issues[0];
  const path = issue?.path ?? [];
  const field =
    path[0] === "exchangeDays"
      ? "pol-days"
      : path[0] === "freeShipping"
        ? "pol-free"
        : path[0] === "localDelivery"
          ? path[1] === "fromCents"
            ? "pol-local-from"
            : "pol-local-cps"
          : path[0] === "pickupHours"
            ? "pol-pickup-1"
            : "pol-domicilio";
  return { field, message: issue?.message ?? "Revisá los datos" };
}

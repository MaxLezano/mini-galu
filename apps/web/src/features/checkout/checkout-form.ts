import {
  type CheckoutContactInput,
  CheckoutContactSchema,
  type PROVINCES,
  type ShippingInput,
  ShippingInputSchema,
  type ShippingMethod,
} from "@mini-galu/contracts";

export type ContactForm = Required<CheckoutContactInput>;

export type ShippingForm = {
  method: ShippingMethod;
  postalCode: string;
  province: (typeof PROVINCES)[number];
  street: string;
  number: string;
  unit: string;
  city: string;
  notes: string;
  pickupSlot: string;
  /** Sucursal Andreani elegida (envío a sucursal). */
  branchId: string;
};

export const EMPTY_CONTACT: ContactForm = { email: "", firstName: "", lastName: "", phone: "", whatsappOptIn: true };

export const EMPTY_SHIPPING: ShippingForm = {
  method: "domicilio",
  postalCode: "",
  province: "CABA",
  street: "",
  number: "",
  unit: "",
  city: "",
  notes: "",
  pickupSlot: "",
  branchId: "",
};

/** Lo que pide la API según la forma de envío (sin campos de más). */
export function toShippingInput(f: ShippingForm): ShippingInput {
  if (f.method === "taller") return { method: "taller", pickupSlot: f.pickupSlot };
  if (f.method === "sucursal")
    return { method: "sucursal", postalCode: f.postalCode, province: f.province, branchId: f.branchId };
  return {
    method: "domicilio",
    postalCode: f.postalCode,
    province: f.province,
    street: f.street,
    number: f.number,
    unit: f.unit.trim() || null,
    city: f.city,
    notes: f.notes.trim() || null,
  };
}

/** Primer error de cada paso (o null si está todo bien), con el campo para enfocarlo. */
export function contactError(f: ContactForm): { field: string; message: string } | null {
  const r = CheckoutContactSchema.safeParse(f);
  if (r.success) return null;
  const i = r.error.issues[0];
  return { field: String(i?.path[0] ?? "email"), message: i?.message ?? "Revisá tus datos" };
}

export function shippingError(f: ShippingForm): { field: string; message: string } | null {
  const r = ShippingInputSchema.safeParse(toShippingInput(f));
  if (r.success) return null;
  const i = r.error.issues[0];
  return { field: String(i?.path[0] ?? "method"), message: i?.message ?? "Revisá el envío" };
}

/** CP argentino escrito a medias: hasta 4 números (o CPA tipo C1414) no se cotiza todavía. */
export const quotablePostalCode = (cp: string) => /^[A-Z]?\d{4}[A-Z]{0,3}$/i.test(cp.trim());

/** Resumen de una línea para el paso cerrado ("Andreani a domicilio · CABA"). */
export function shippingSummary(f: ShippingForm, slotLabel?: string, branchName?: string): string {
  if (f.method === "taller") return `Retiro en el taller${slotLabel ? ` · ${slotLabel}` : ""}`;
  if (f.method === "sucursal" && branchName) return `Andreani a sucursal · ${branchName}`;
  return `${f.method === "domicilio" ? "Andreani a domicilio" : "Andreani a sucursal"} · ${f.province}`;
}

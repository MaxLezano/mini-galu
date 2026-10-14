import { z } from "zod";
import { SizeSchema } from "./catalog";
import { type Cents, installment } from "./money";
import type { OrderStatus, PaymentMethod, ShippingMethod } from "./orders";

/* ------------------------------------------------------------------ bolsa */

export type CartLine = {
  slug: string;
  size: z.infer<typeof SizeSchema>;
  qty: number;
  name: string;
  colorName: string;
  priceCents: Cents;
  imageUrl: string;
  /** Stock disponible del talle (tope para la cantidad). */
  maxStock: number;
};

export type CartView = { lines: CartLine[]; subtotalCents: Cents; count: number };

export const CartItemInputSchema = z.object({
  slug: z.string().min(1).max(120),
  size: SizeSchema,
  qty: z.number().int().min(0).max(99),
});
export type CartItemInput = z.infer<typeof CartItemInputSchema>;

/** Lo que había en el navegador (bolsa vieja en localStorage) se suma a la del servidor. */
export const CartMergeInputSchema = z.object({ lines: z.array(CartItemInputSchema).max(50) });

/* ------------------------------------------------------------------ datos del cliente */

/**
 * Celular argentino → E.164 (+54 9 + característica + número). Acepta "11 5555-1234", "011 5555 1234",
 * "+54 9 11 5555 1234". Devuelve null si no se puede interpretar sin adivinar (por ejemplo, con el 15).
 */
export function toE164AR(input: string): string | null {
  const trimmed = input.trim();
  let d = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("+") && !d.startsWith("54")) return /^[1-9]\d{6,14}$/.test(d) ? `+${d}` : null;
  if (d.startsWith("549")) d = d.slice(3);
  else if (d.startsWith("54")) d = d.slice(2);
  if (d.startsWith("0")) d = d.slice(1);
  return /^[1-9]\d{9}$/.test(d) ? `+549${d}` : null;
}

export const CheckoutContactSchema = z.object({
  email: z.string().trim().toLowerCase().max(120).pipe(z.email("Revisá el email")),
  firstName: z.string().trim().min(1, "Poné tu nombre").max(60),
  lastName: z.string().trim().min(1, "Poné tu apellido").max(60),
  phone: z
    .string()
    .trim()
    .transform((s, ctx) => {
      const e164 = toE164AR(s);
      if (!e164) {
        ctx.addIssue({
          code: "custom",
          message: "Escribí el celular con característica y sin el 15 (ej. 11 5555-1234)",
        });
        return z.NEVER;
      }
      return e164;
    }),
  whatsappOptIn: z.boolean().default(true),
});
export type CheckoutContactInput = z.input<typeof CheckoutContactSchema>;

/* ------------------------------------------------------------------ envío */

export const PROVINCES = [
  "CABA",
  "Buenos Aires",
  "Catamarca",
  "Chaco",
  "Chubut",
  "Córdoba",
  "Corrientes",
  "Entre Ríos",
  "Formosa",
  "Jujuy",
  "La Pampa",
  "La Rioja",
  "Mendoza",
  "Misiones",
  "Neuquén",
  "Río Negro",
  "Salta",
  "San Juan",
  "San Luis",
  "Santa Cruz",
  "Santa Fe",
  "Santiago del Estero",
  "Tierra del Fuego",
  "Tucumán",
] as const;

const PostalCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]?\d{4}[A-Z]{0,3}$/, "Código postal inválido");
const ProvinceSchema = z.enum(PROVINCES, "Elegí la provincia");

export const ShippingInputSchema = z.discriminatedUnion("method", [
  z.object({
    method: z.literal("domicilio"),
    postalCode: PostalCodeSchema,
    province: ProvinceSchema,
    street: z.string().trim().min(2, "Poné la calle").max(120),
    number: z.string().trim().min(1, "Poné la altura").max(10),
    unit: z.string().trim().max(20).nullable().default(null),
    city: z.string().trim().min(2, "Poné la localidad").max(80),
    notes: z.string().trim().max(300).nullable().default(null),
  }),
  z.object({ method: z.literal("sucursal"), postalCode: PostalCodeSchema, province: ProvinceSchema }),
  z.object({ method: z.literal("taller"), pickupSlot: z.string().min(1, "Elegí cuándo pasás a retirar") }),
]);
export type ShippingInput = z.input<typeof ShippingInputSchema>;

export type ShippingOption = {
  method: ShippingMethod;
  label: string;
  detail: string;
  /** null si todavía no se puede cotizar (falta el CP). */
  cents: Cents | null;
};

export type PickupSlot = { id: string; label: string };

export type ShippingOptions = { options: ShippingOption[]; pickupSlots: PickupSlot[]; workshop: string };

/* ------------------------------------------------------------------ cotización y pedido */

export const QuoteRequestSchema = z.object({
  method: z.enum(["domicilio", "sucursal", "taller"]),
  postalCode: PostalCodeSchema.optional(),
  couponCode: z.string().trim().max(30).optional(),
  email: z.email().optional(),
});
export type QuoteRequest = z.infer<typeof QuoteRequestSchema>;

export type AppliedCoupon = { code: string; label: string; discountCents: Cents; freeShipping: boolean };

export type Quote = {
  lines: CartLine[];
  subtotalCents: Cents;
  discountCents: Cents;
  shippingCents: Cents;
  totalCents: Cents;
  coupon: AppliedCoupon | null;
  /** Si el código no aplica, por qué (sin cortar la compra). */
  couponError: string | null;
  freeShippingFromCents: Cents;
};

export const PlaceOrderInputSchema = z.object({
  contact: CheckoutContactSchema,
  shipping: ShippingInputSchema,
  couponCode: z.string().trim().max(30).nullable().default(null),
});
export type PlaceOrderInput = z.input<typeof PlaceOrderInputSchema>;

export type PlacedOrder = {
  orderId: string;
  number: string;
  accessToken: string;
  totalCents: Cents;
  reservedUntil: string;
};

/* ------------------------------------------------------------------ pago */

export const CHECKOUT_PAYMENT_METHODS = ["credito", "debito", "dinero_cuenta"] as const;
export type CheckoutPaymentMethod = (typeof CHECKOUT_PAYMENT_METHODS)[number];

/** Lo que manda el Payment Brick (o el formulario simulado) para cobrar con tarjeta. */
export const CardPaymentInputSchema = z.object({
  method: z.enum(["credito", "debito"]),
  token: z.string().min(1),
  paymentMethodId: z.string().min(1).max(40),
  issuerId: z.string().max(20).nullable().default(null),
  installments: z.number().int().min(1).max(24),
  payer: z.object({
    email: z.email(),
    identification: z
      .object({ type: z.string().max(10), number: z.string().max(20) })
      .nullable()
      .default(null),
  }),
  /** Solo el modo simulado: nombre como figura en la tarjeta (APRO, OTHE, CONT como en Mercado Pago). */
  holderName: z.string().max(60).optional(),
});
export type CardPaymentInput = z.input<typeof CardPaymentInputSchema>;

export type PaymentOutcome = "approved" | "pending" | "rejected";

export type PayResult = { outcome: PaymentOutcome; message: string };

/** Dinero en cuenta: el Brick lleva a Mercado Pago con esta preferencia. */
export type WalletPreference = { preferenceId: string | null; redirectUrl: string | null };

export type CheckoutConfig = {
  /** "mercadopago" con credenciales; "simulado" en local sin cuenta conectada (formulario propio + pagos de mentira). */
  gateway: "mercadopago" | "simulado";
  publicKey: string | null;
  mode: "prueba" | "produccion" | "simulado";
  methods: Record<CheckoutPaymentMethod, boolean>;
  maxInstallments: number;
};

export type OrderReceipt = {
  number: string;
  status: OrderStatus;
  firstName: string;
  email: string;
  paymentMethod: PaymentMethod | null;
  installments: number | null;
  shippingMethod: ShippingMethod;
  pickupSlot: string | null;
  subtotalCents: Cents;
  discountCents: Cents;
  shippingCents: Cents;
  totalCents: Cents;
  createdAt: string;
  reservedUntil: string | null;
  items: { name: string; size: string; qty: number; imageUrl: string; unitPriceCents: Cents }[];
};

/* ------------------------------------------------------------------ ajustes de pago (panel) */

export const PaymentSettingsSchema = z.object({
  credito: z.boolean(),
  debito: z.boolean(),
  dinero_cuenta: z.boolean(),
  /**
   * Cuotas máximas que se ofrecen en el checkout (1 = solo un pago). Con o sin interés lo decide la cuenta de
   * Mercado Pago: las cuotas sin interés se activan allá y las paga el comercio.
   */
  maxInstallments: z.union([z.literal(1), z.literal(3), z.literal(6), z.literal(12)]),
});
export type PaymentSettings = z.infer<typeof PaymentSettingsSchema>;

export const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = {
  credito: true,
  debito: true,
  dinero_cuenta: true,
  maxInstallments: 6,
};

/**
 * Lo que Mercado Pago ofrece para un monto. `interestFree`: cuotas sin interés que da cualquier tarjeta Visa o
 * Mastercard (1 = ninguna). `max`: cuotas máximas (con interés), con el tope del panel.
 */
export type InstallmentPlan = { interestFree: number; max: number };

/** Una opción de cuotas de una tarjeta puntual (lo que cobra su banco, con el interés incluido). */
export type CardInstallment = {
  installments: number;
  installmentCents: Cents;
  /** Lo que termina pagando el cliente (el pedido cobra el precio; el interés lo financia la tarjeta). */
  totalCents: Cents;
  interestFree: boolean;
  /** Costo financiero total ("199,00%"): obligatorio mostrarlo al ofrecer financiación. */
  cft: string | null;
};

/** Planes de la tarjeta que se está cargando (se consultan por los primeros dígitos). */
export type CardPlans = { brand: string | null; debit: boolean; plans: CardInstallment[] };

/** Texto de cuotas para la tienda. Solo promete "sin interés" si Mercado Pago lo confirma para ese monto. */
export function installmentsLabel(plan: InstallmentPlan, cents: Cents, money: (c: Cents) => string): string | null {
  if (plan.interestFree > 1)
    return `${plan.interestFree} cuotas sin interés de ${money(installment(cents, plan.interestFree))}`;
  if (plan.max > 1) return `Hasta ${plan.max} cuotas con Mercado Pago`;
  return null;
}

export type AdminPayments = {
  settings: PaymentSettings;
  gateway: CheckoutConfig["gateway"];
  mode: CheckoutConfig["mode"];
  webhookUrl: string;
};

/* ------------------------------------------------------------------ cupones (panel) */

export const COUPON_KINDS = { percent: "Porcentaje", fixed: "Monto fijo", free_shipping: "Envío gratis" } as const;
export type CouponKind = keyof typeof COUPON_KINDS;

export const COUPON_AUDIENCES = {
  todos: "Todos",
  primera_compra: "Primera compra",
  resena: "Después de dejar una reseña",
  cumple: "Mail de cumpleaños",
  anotados: "Anotados al lanzamiento",
} as const;
export type CouponAudience = keyof typeof COUPON_AUDIENCES;

export const CouponInputSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .transform((s) => s.replace(/\s+/g, ""))
      .pipe(z.string().regex(/^[A-Z0-9-]{3,20}$/, "El código lleva de 3 a 20 letras, números o guiones")),
    kind: z.enum(Object.keys(COUPON_KINDS) as [CouponKind, ...CouponKind[]]),
    /** Porcentaje o monto en centavos. */
    value: z.number().int().min(0),
    minSubtotalCents: z.number().int().positive().nullable().default(null),
    audience: z.enum(Object.keys(COUPON_AUDIENCES) as [CouponAudience, ...CouponAudience[]]).default("todos"),
    endsAt: z.iso.datetime({ offset: true }).nullable().default(null),
    maxUses: z.number().int().positive().nullable().default(null),
    oncePerCustomer: z.boolean().default(true),
    active: z.boolean().default(true),
  })
  .superRefine((c, ctx) => {
    if (c.kind === "percent" && (c.value < 1 || c.value > 100))
      ctx.addIssue({ code: "custom", path: ["value"], message: "El porcentaje va de 1 a 100" });
    if (c.kind === "fixed" && c.value < 100)
      ctx.addIssue({ code: "custom", path: ["value"], message: "Poné el monto del descuento" });
  });
export type CouponInput = z.input<typeof CouponInputSchema>;

export type AdminCoupon = z.output<typeof CouponInputSchema> & { id: string; timesUsed: number; createdAt: string };

/** "15%", "$5.000", "Envío gratis". */
export function couponLabel(c: { kind: CouponKind; value: number }, money: (cents: number) => string): string {
  if (c.kind === "percent") return `${c.value}%`;
  if (c.kind === "fixed") return money(c.value);
  return "Envío gratis";
}

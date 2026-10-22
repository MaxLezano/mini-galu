import type {
  ApiError,
  AssistantRulesLog,
  AssistantTaught,
  CardPaymentInput,
  CardPlans,
  CartItemInput,
  CartView,
  CatalogQueryInput,
  CheckoutConfig,
  ContactChannel,
  Facets,
  GiftcardBalance,
  GiftcardCreated,
  GiftcardPurchase,
  HelpLink,
  HelpPage,
  HelpTopic,
  HomeContent,
  InstallmentPlan,
  LaunchVisitRequest,
  OrderReceipt,
  PayResult,
  PlacedOrder,
  PlaceOrderInput,
  ProductDetail,
  ProductSummary,
  PublicTracking,
  PublicWishlist,
  Quote,
  QuoteRequest,
  ReviewableItem,
  ReviewableOrder,
  RevocationInput,
  RevocationReceipt,
  ShippingOptions,
  Size,
  StorePolicies,
  WalletPreference,
} from "@mini-galu/contracts";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    // con FormData (fotos) el navegador pone el content-type con su boundary
    headers: init?.body instanceof FormData ? init.headers : { "content-type": "application/json", ...init?.headers },
    // la bolsa y el checkout viajan con la cookie de invitada (mg_cart)
    credentials: "include",
    // stock y precios cambian: nada de cache en el server de Next
    cache: "no-store",
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiError | null;
    throw new ApiRequestError(
      res.status,
      body?.error.code ?? "http_error",
      body?.error.message ?? res.statusText,
      body?.error.details,
    );
  }
  return (res.status === 204 ? undefined : res.json()) as Promise<T>;
}

export function toSearchParams(q: CatalogQueryInput): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) {
    if (v === undefined || v === "" || (Array.isArray(v) && !v.length)) continue;
    sp.set(k, Array.isArray(v) ? v.join(",") : String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export const api = {
  products: (q: CatalogQueryInput = {}, init?: RequestInit) =>
    request<ProductSummary[]>(`/catalog/products${toSearchParams(q)}`, init),
  product: (slug: string) => request<ProductDetail>(`/catalog/products/${encodeURIComponent(slug)}`),
  facets: () => request<Facets>("/catalog/facets"),
  home: () => request<HomeContent>("/content/home"),
  policies: () => request<StorePolicies>("/policies"),
  help: (topic: HelpTopic) => request<HelpPage>(`/content/help/${topic}`),
  helpLinks: () => request<HelpLink[]>("/content/help"),
  joinWaitlist: (body: { slug: string; size: Size | null; channel: ContactChannel; contact: string }) =>
    request<{ created: boolean; position: number }>("/catalog/waitlist", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  joinLaunch: (launchId: string, body: { channel: ContactChannel; contact: string }) =>
    request<{ created: boolean; signups: number }>(`/content/launches/${launchId}/signups`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  launchVisit: (body: LaunchVisitRequest) =>
    request<void>("/content/launches/visits", { method: "POST", body: JSON.stringify(body), keepalive: true }),

  /* bolsa (fase 3: guardada en el servidor) */
  cart: () => request<CartView>("/cart"),
  cartAdd: (body: CartItemInput) => request<CartView>("/cart/items", { method: "POST", body: JSON.stringify(body) }),
  cartSet: (body: CartItemInput) => request<CartView>("/cart/items", { method: "PUT", body: JSON.stringify(body) }),
  cartMerge: (lines: CartItemInput[]) =>
    request<CartView>("/cart/merge", { method: "POST", body: JSON.stringify({ lines }) }),
  /* checkout */
  checkoutConfig: () => request<CheckoutConfig>("/checkout/config"),
  installments: (amounts: number[]) =>
    request<Record<number, InstallmentPlan>>(`/checkout/installments?amounts=${amounts.join(",")}`),
  /** `extra`: centavos que se suman a la bolsa para cotizar (la prenda de la ficha). */
  shipping: (cp?: string, extra?: number) => {
    const q = new URLSearchParams();
    if (cp) q.set("cp", cp);
    if (extra) q.set("extra", String(extra));
    const qs = q.toString();
    return request<ShippingOptions>(`/checkout/shipping${qs ? `?${qs}` : ""}`);
  },
  quote: (body: QuoteRequest) => request<Quote>("/checkout/quote", { method: "POST", body: JSON.stringify(body) }),
  placeOrder: (body: PlaceOrderInput) =>
    request<PlacedOrder>("/checkout/orders", { method: "POST", body: JSON.stringify(body) }),
  buyGiftcard: (body: GiftcardPurchase) =>
    request<GiftcardCreated>("/giftcards", { method: "POST", body: JSON.stringify(body) }),
  giftcardBalance: (code: string) => request<GiftcardBalance>(`/giftcards/${encodeURIComponent(code)}`),
  wishlist: (slug: string) => request<PublicWishlist>(`/lists/${encodeURIComponent(slug)}`),
  subscribe: (email: string, source: "footer" | "cuenta" | "registro" = "footer") =>
    request<null>("/newsletter", { method: "POST", body: JSON.stringify({ email, source }) }),
  /** Galú por reglas: la pregunta y la respuesta quedan en el panel (`/taller/galu`). */
  galuLog: (body: AssistantRulesLog) => request<null>("/assistant/log", { method: "POST", body: JSON.stringify(body) }),
  /** Galú por reglas: lo que le enseñó Gaby que responde la pregunta (null si nada). */
  galuTaught: (q: string) => request<AssistantTaught>(`/assistant/taught?q=${encodeURIComponent(q)}`),
  /** Botón de arrepentimiento: pide la baja de un pedido (sin cuenta). */
  revoke: (input: RevocationInput) =>
    request<RevocationReceipt>("/revocations", { method: "POST", body: JSON.stringify(input) }),
  unsubscribe: (t: string) => request<null>("/newsletter/baja", { method: "POST", body: JSON.stringify({ t }) }),
  track: (code: string, t?: string) =>
    request<PublicTracking>(`/tracking/${encodeURIComponent(code)}${t ? `?t=${encodeURIComponent(t)}` : ""}`),
  reviewOrder: (number: string, t: string) =>
    request<ReviewableOrder>(`/reviews/${encodeURIComponent(number)}?t=${encodeURIComponent(t)}`),
  /** Estrellas, texto, talle y la foto (opcional) en un FormData: rating, body, fit, photo. */
  submitReview: (number: string, t: string, itemId: string, form: FormData) =>
    request<ReviewableItem>(
      `/reviews/${encodeURIComponent(number)}/items/${encodeURIComponent(itemId)}?t=${encodeURIComponent(t)}`,
      { method: "POST", body: form },
    ),
  receipt: (number: string, t: string) =>
    request<OrderReceipt>(`/checkout/orders/${encodeURIComponent(number)}?t=${encodeURIComponent(t)}`),
  payCard: (number: string, t: string, card: CardPaymentInput) =>
    request<PayResult>(`/checkout/orders/${encodeURIComponent(number)}/pay`, {
      method: "POST",
      body: JSON.stringify({ t, card }),
    }),
  /** Con `preferenceId` actualiza esa preferencia (cambió el total) en vez de crear otra. */
  wallet: (number: string, t: string, preferenceId: string | null = null) =>
    request<WalletPreference>(`/checkout/orders/${encodeURIComponent(number)}/wallet`, {
      method: "POST",
      body: JSON.stringify({ t, preferenceId }),
    }),
  /** Cupón en el paso de pago: recalcula el mismo pedido (no se rearma el formulario de pago). */
  changeCoupon: (number: string, t: string, couponCode: string | null) =>
    request<PlacedOrder>(`/checkout/orders/${encodeURIComponent(number)}/coupon`, {
      method: "POST",
      body: JSON.stringify({ t, couponCode }),
    }),
  /** Planes de la tarjeta que se está cargando (por sus primeros dígitos) para el total del pedido. */
  cardPlans: (number: string, t: string, bin: string) =>
    request<CardPlans>(
      `/checkout/orders/${encodeURIComponent(number)}/installments?t=${encodeURIComponent(t)}&bin=${encodeURIComponent(bin)}`,
    ),
  syncPayment: (number: string, t: string, paymentId: string) =>
    request<void>(`/checkout/orders/${encodeURIComponent(number)}/sync`, {
      method: "POST",
      body: JSON.stringify({ t, paymentId }),
    }),
  /** ¿Ya se pagó? (mientras el cliente paga en la pestaña de Mercado Pago). */
  checkPayment: (number: string, t: string) =>
    request<{ paid: boolean }>(`/checkout/orders/${encodeURIComponent(number)}/check`, {
      method: "POST",
      body: JSON.stringify({ t }),
    }),
};

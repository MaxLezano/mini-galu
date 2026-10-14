import type {
  AdminAutomations,
  AdminCoupon,
  AdminCustomerDetail,
  AdminHome,
  AdminLaunch,
  AdminNewsletter,
  AdminOrderDetail,
  AdminOrderSummary,
  AdminPayments,
  AdminProduct,
  AdminShipping,
  AutomationKey,
  Collection,
  CouponInput,
  HomeHeroInput,
  LaunchInput,
  OrderStatus,
  PaymentLinkCreated,
  PaymentLinkInput,
  PaymentSettings,
  ProductInput,
  ProductStatus,
  SaveProductResult,
  ShipmentCreated,
  ShippingSettings,
  UploadResult,
} from "@mini-galu/contracts";
import { API_URL, ApiRequestError } from "./api";

/**
 * API del panel del taller desde el navegador: la cookie de sesión (Better Auth) viaja con credentials: "include".
 * En el servidor de Next se usa lib/admin-server.ts, que reenvía la cookie.
 */
async function adminRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const isForm = init?.body instanceof FormData;
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: isForm ? init?.headers : { "content-type": "application/json", ...init?.headers },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    // falta la verificación en dos pasos (producción): se manda a activarla
    if (body?.error?.code === "two_factor_required" && typeof window !== "undefined")
      window.location.assign("/taller/seguridad");
    const issue = body?.error?.details?.[0]?.message as string | undefined;
    throw new ApiRequestError(
      res.status,
      body?.error?.code ?? body?.code ?? "http_error",
      // la API responde { error: { message } }; Better Auth (/auth/*), { message }
      issue ?? body?.error?.message ?? body?.message ?? res.statusText,
    );
  }
  return (res.status === 204 ? null : body) as T;
}

export const adminApi = {
  signIn: (email: string, password: string) =>
    adminRequest<{ user?: { name: string }; twoFactorRedirect?: boolean }>("/auth/sign-in/email", {
      method: "POST",
      body: JSON.stringify({ email, password, rememberMe: true }),
    }),
  /** Segundo paso del ingreso: código de la app (6 números) o uno de respaldo. */
  verifySecondStep: (code: string, backup: boolean, trustDevice: boolean) =>
    adminRequest<unknown>(backup ? "/auth/two-factor/verify-backup-code" : "/auth/two-factor/verify-totp", {
      method: "POST",
      body: JSON.stringify({ code: code.trim(), trustDevice }),
    }),
  enableTwoFactor: (password: string) =>
    adminRequest<{ totpURI: string; backupCodes: string[] }>("/auth/two-factor/enable", {
      method: "POST",
      body: JSON.stringify({ password }),
    }),
  /** Confirma la activación con el primer código de la app. */
  confirmTwoFactor: (code: string) =>
    adminRequest<unknown>("/auth/two-factor/verify-totp", {
      method: "POST",
      body: JSON.stringify({ code: code.trim() }),
    }),
  disableTwoFactor: (password: string) =>
    adminRequest<unknown>("/auth/two-factor/disable", { method: "POST", body: JSON.stringify({ password }) }),
  signOut: () => adminRequest<unknown>("/auth/sign-out", { method: "POST", body: "{}" }),
  products: () => adminRequest<AdminProduct[]>("/admin/catalog/products"),
  collections: () => adminRequest<Collection[]>("/admin/catalog/collections"),
  createProduct: (input: ProductInput) =>
    adminRequest<SaveProductResult>("/admin/catalog/products", { method: "POST", body: JSON.stringify(input) }),
  updateProduct: (slug: string, input: ProductInput) =>
    adminRequest<SaveProductResult>(`/admin/catalog/products/${slug}`, { method: "PUT", body: JSON.stringify(input) }),
  setStatus: (slug: string, status: ProductStatus) =>
    adminRequest<AdminProduct>(`/admin/catalog/products/${slug}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  uploadImage: (file: File, folder: "products" | "content" = "products") => {
    const fd = new FormData();
    fd.set("file", file);
    fd.set("folder", folder);
    return adminRequest<UploadResult>("/admin/catalog/images", { method: "POST", body: fd });
  },
  launches: () => adminRequest<AdminLaunch[]>("/admin/content/launches"),
  saveHome: (input: HomeHeroInput) =>
    adminRequest<AdminHome>("/admin/content/home", { method: "PUT", body: JSON.stringify(input) }),
  createLaunch: (input: LaunchInput) =>
    adminRequest<AdminLaunch>("/admin/content/launches", { method: "POST", body: JSON.stringify(input) }),
  updateLaunch: (id: string, input: LaunchInput) =>
    adminRequest<AdminLaunch>(`/admin/content/launches/${id}`, { method: "PUT", body: JSON.stringify(input) }),
  deleteLaunch: (id: string) => adminRequest<null>(`/admin/content/launches/${id}`, { method: "DELETE" }),
  payments: () => adminRequest<AdminPayments>("/admin/payments"),
  updateAutomation: (key: AutomationKey, upd: { on?: boolean; message?: string }) =>
    adminRequest<AdminAutomations>(`/admin/automations/${key}`, { method: "PATCH", body: JSON.stringify(upd) }),
  testAutomations: (email: string) =>
    adminRequest<{ sent: number }>("/admin/automations/test", { method: "POST", body: JSON.stringify({ email }) }),
  newsletter: () => adminRequest<AdminNewsletter>("/admin/newsletter"),
  customer: (email: string) => adminRequest<AdminCustomerDetail>(`/admin/customers/${encodeURIComponent(email)}`),
  saveCustomerNote: (email: string, note: string) =>
    adminRequest<null>(`/admin/customers/${encodeURIComponent(email)}/note`, {
      method: "PUT",
      body: JSON.stringify({ note }),
    }),
  customersCsvUrl: () => `${API_URL}/admin/customers/clientes.csv`,
  subscribersCsvUrl: () => `${API_URL}/admin/newsletter/suscriptos.csv`,
  testLetter: (input: { subject: string; body: string; email: string }) =>
    adminRequest<null>("/admin/newsletter/test", { method: "POST", body: JSON.stringify(input) }),
  sendLetter: (input: { subject: string; body: string }) =>
    adminRequest<{ recipients: number }>("/admin/newsletter/send", { method: "POST", body: JSON.stringify(input) }),
  saveShipping: (input: ShippingSettings) =>
    adminRequest<AdminShipping>("/admin/shipping", { method: "PUT", body: JSON.stringify(input) }),
  savePayments: (s: PaymentSettings) =>
    adminRequest<AdminPayments>("/admin/payments", { method: "PUT", body: JSON.stringify(s) }),
  createCoupon: (input: CouponInput) =>
    adminRequest<AdminCoupon>("/admin/coupons", { method: "POST", body: JSON.stringify(input) }),
  updateCoupon: (id: string, input: CouponInput) =>
    adminRequest<AdminCoupon>(`/admin/coupons/${id}`, { method: "PUT", body: JSON.stringify(input) }),
  setCouponActive: (id: string, active: boolean) =>
    adminRequest<AdminCoupon>(`/admin/coupons/${id}/active`, { method: "PATCH", body: JSON.stringify({ active }) }),
  deleteCoupon: (id: string) => adminRequest<null>(`/admin/coupons/${id}`, { method: "DELETE" }),
  orders: () => adminRequest<AdminOrderSummary[]>("/admin/orders"),
  createLabel: (number: string) =>
    adminRequest<ShipmentCreated>(`/admin/orders/${encodeURIComponent(number)}/label`, { method: "POST" }),
  /** PDF de la etiqueta (se abre en otra pestaña con la cookie del panel). */
  labelUrl: (number: string) => `${API_URL}/admin/orders/${encodeURIComponent(number)}/label`,
  createPaymentLink: (input: PaymentLinkInput) =>
    adminRequest<PaymentLinkCreated>("/admin/orders/links", { method: "POST", body: JSON.stringify(input) }),
  order: (number: string) => adminRequest<AdminOrderDetail>(`/admin/orders/${encodeURIComponent(number)}`),
  moveOrder: (number: string, to: OrderStatus) =>
    adminRequest<AdminOrderDetail>(`/admin/orders/${encodeURIComponent(number)}/status`, {
      method: "PATCH",
      body: JSON.stringify({ to }),
    }),
  advanceOrders: (numbers: string[]) =>
    adminRequest<{ moved: string[]; skipped: { number: string; reason: string }[] }>("/admin/orders/advance", {
      method: "POST",
      body: JSON.stringify({ numbers }),
    }),
  saveOrderNote: (number: string, note: string) =>
    adminRequest<null>(`/admin/orders/${encodeURIComponent(number)}/note`, {
      method: "PUT",
      body: JSON.stringify({ note }),
    }),
};

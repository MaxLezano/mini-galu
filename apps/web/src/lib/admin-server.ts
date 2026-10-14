import "server-only";
import type {
  AdminAutomations,
  AdminCoupon,
  AdminDaySummary,
  AdminHome,
  AdminLaunch,
  AdminNewsletter,
  AdminOrderSummary,
  AdminPayments,
  AdminProduct,
  AdminSession,
  AdminShipping,
  Collection,
} from "@mini-galu/contracts";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { API_URL } from "./api";

/** Llamadas del panel desde el servidor de Next: reenvía la cookie de sesión a la API. */
async function serverRequest<T>(path: string): Promise<T> {
  const cookie = (await cookies()).toString();
  const res = await fetch(`${API_URL}${path}`, { headers: { cookie }, cache: "no-store" });
  if (res.status === 403) {
    const body = (await res.json().catch(() => null)) as { error?: { code?: string } } | null;
    // la cuenta entra pero le falta la verificación en dos pasos (obligatoria en producción)
    if (body?.error?.code === "two_factor_required") redirect("/taller/seguridad");
  }
  if (res.status === 401 || res.status === 403) redirect("/taller/ingresar");
  if (!res.ok) throw new Error(`API ${path}: ${res.status}`);
  return res.json() as Promise<T>;
}

/** Sesión del taller o null (sin sesión, vencida o cuenta que no es admin). */
export async function getAdminSession(): Promise<AdminSession | null> {
  const cookie = (await cookies()).toString();
  if (!cookie) return null;
  const res = await fetch(`${API_URL}/auth/get-session`, { headers: { cookie }, cache: "no-store" }).catch(() => null);
  const data = (await res?.json().catch(() => null)) as { user?: AdminSession & { role?: string } } | null;
  if (data?.user?.role !== "admin") return null;
  return {
    id: data.user.id,
    name: data.user.name,
    email: data.user.email,
    twoFactorEnabled: !!data.user.twoFactorEnabled,
  };
}

export const adminServer = {
  products: () => serverRequest<AdminProduct[]>("/admin/catalog/products"),
  collections: () => serverRequest<Collection[]>("/admin/catalog/collections"),
  launches: () => serverRequest<AdminLaunch[]>("/admin/content/launches"),
  home: () => serverRequest<AdminHome>("/admin/content/home"),
  payments: () => serverRequest<AdminPayments>("/admin/payments"),
  shipping: () => serverRequest<AdminShipping>("/admin/shipping"),
  automations: () => serverRequest<AdminAutomations>("/admin/automations"),
  newsletter: () => serverRequest<AdminNewsletter>("/admin/newsletter"),
  coupons: () => serverRequest<AdminCoupon[]>("/admin/coupons"),
  orders: () => serverRequest<AdminOrderSummary[]>("/admin/orders"),
  summary: () => serverRequest<AdminDaySummary>("/admin/orders/summary"),
};

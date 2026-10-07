import type {
  AdminHome,
  AdminLaunch,
  AdminProduct,
  Collection,
  HomeHeroInput,
  LaunchInput,
  ProductInput,
  ProductStatus,
  SaveProductResult,
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
    const issue = body?.error?.details?.[0]?.message as string | undefined;
    throw new ApiRequestError(
      res.status,
      body?.error?.code ?? "http_error",
      issue ?? body?.error?.message ?? res.statusText,
    );
  }
  return body as T;
}

export const adminApi = {
  signIn: (email: string, password: string) =>
    adminRequest<{ user: { name: string } }>("/auth/sign-in/email", {
      method: "POST",
      body: JSON.stringify({ email, password, rememberMe: true }),
    }),
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
};

import type {
  ApiError,
  CatalogQueryInput,
  ContactChannel,
  Facets,
  HomeContent,
  ProductDetail,
  ProductSummary,
  Size,
} from "@mini-galu/contracts";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
    // stock y precios cambian: nada de cache en el server de Next
    cache: "no-store",
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiError | null;
    throw new ApiRequestError(res.status, body?.error.code ?? "http_error", body?.error.message ?? res.statusText);
  }
  return res.json() as Promise<T>;
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
};

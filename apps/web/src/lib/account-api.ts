import type {
  AccountAddress,
  AccountChild,
  AccountOverview,
  AccountProfile,
  AddressInput,
  ChildInput,
  ProfileUpdate,
  SignUpInput,
} from "@mini-galu/contracts";
import { API_URL, ApiRequestError } from "./api";

/** Cuenta de la tienda desde el navegador: la cookie de sesión (Better Auth) viaja con credentials. */
async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: { "content-type": "application/json", ...init?.headers },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const issue = body?.error?.details?.[0]?.message as string | undefined;
    throw new ApiRequestError(
      res.status,
      body?.error?.code ?? body?.code ?? "http_error",
      issue ?? body?.error?.message ?? body?.message ?? res.statusText,
    );
  }
  return (res.status === 204 ? null : body) as T;
}

const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) });

export type SessionUser = { id: string; firstName: string; name: string; email: string; role: string };

export const accountApi = {
  session: async (): Promise<SessionUser | null> => {
    const r = await call<{ user?: SessionUser } | null>("/auth/get-session").catch(() => null);
    return r?.user ?? null;
  },
  signIn: (email: string, password: string, rememberMe: boolean) =>
    call<{ user?: SessionUser; twoFactorRedirect?: boolean }>(
      "/auth/sign-in/email",
      json("POST", { email, password, rememberMe }),
    ),
  signUp: (i: SignUpInput, callbackURL: string) =>
    call<{ user: SessionUser }>(
      "/auth/sign-up/email",
      json("POST", {
        email: i.email,
        password: i.password,
        name: `${i.firstName} ${i.lastName}`.trim(),
        firstName: i.firstName,
        lastName: i.lastName,
        newsletterOptIn: i.newsletter,
        callbackURL,
      }),
    ),
  /** Google: la API devuelve la URL de Google y el navegador va para allá. */
  google: (callbackURL: string) =>
    call<{ url: string }>("/auth/sign-in/social", json("POST", { provider: "google", callbackURL })),
  options: () => call<{ google: boolean }>("/account/options"),
  requestReset: (email: string, redirectTo: string) =>
    call<unknown>("/auth/request-password-reset", json("POST", { email, redirectTo })),
  resetPassword: (token: string, newPassword: string) =>
    call<unknown>("/auth/reset-password", json("POST", { token, newPassword })),
  changePassword: (currentPassword: string, newPassword: string) =>
    call<unknown>("/auth/change-password", json("POST", { currentPassword, newPassword, revokeOtherSessions: true })),
  signOut: () => call<unknown>("/auth/sign-out", json("POST", {})),

  overview: () => call<AccountOverview>("/me"),
  saveProfile: (p: ProfileUpdate) => call<AccountProfile>("/me/profile", json("PUT", p)),
  addChild: (c: ChildInput) => call<AccountChild>("/me/children", json("POST", c)),
  updateChild: (id: string, c: ChildInput) => call<AccountChild>(`/me/children/${id}`, json("PUT", c)),
  deleteChild: (id: string) => call<null>(`/me/children/${id}`, { method: "DELETE" }),
  addWish: (childId: string, slug: string, size: string) =>
    call<AccountChild>(`/me/children/${childId}/wishlist`, json("POST", { slug, size })),
  removeWish: (childId: string, itemId: string) =>
    call<AccountChild>(`/me/children/${childId}/wishlist/${itemId}`, { method: "DELETE" }),
  addAddress: (a: AddressInput) => call<AccountAddress>("/me/addresses", json("POST", a)),
  updateAddress: (id: string, a: AddressInput) => call<AccountAddress>(`/me/addresses/${id}`, json("PUT", a)),
  deleteAddress: (id: string) => call<null>(`/me/addresses/${id}`, { method: "DELETE" }),
  setFavorite: (slug: string, on: boolean) =>
    call<string[]>(`/me/favorites/${encodeURIComponent(slug)}`, json("PUT", { on })),
  mergeFavorites: (slugs: string[]) => call<string[]>("/me/favorites/merge", json("POST", { slugs })),
};

import { type NextRequest, NextResponse } from "next/server";

/**
 * Chequeo optimista del panel: sin cookie de sesión, directo a ingresar.
 * La verificación real la hacen el layout del panel (getAdminSession) y la API (requireAdmin).
 */
export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (pathname === "/taller/ingresar") return NextResponse.next();
  const hasSession = req.cookies.getAll().some((c) => c.name.endsWith("better-auth.session_token"));
  if (hasSession) return NextResponse.next();
  const url = new URL("/taller/ingresar", req.url);
  url.searchParams.set("volver", pathname + search);
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/taller", "/taller/:path*"] };

import { NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

// Protege el dashboard y el estudio. El resto de la app es público.
export async function proxy(request) {
  const { pathname } = request.nextUrl;

  const sessionCookie = request.cookies.get(SESSION_COOKIE);
  const session = sessionCookie
    ? await verifySessionToken(sessionCookie.value)
    : null;

  if (pathname.startsWith("/dashboard") && !session) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("next", pathname);
    if (sessionCookie) url.searchParams.set("why", "session-invalid");
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Solo corre en el dashboard (evita pasarse por api/_next/static/assets)
    "/dashboard/:path*",
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)",
  ],
};
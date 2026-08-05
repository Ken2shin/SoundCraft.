import { NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

export const runtime = "nodejs";

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  
  // 1. Dejar pasar peticiones internas de Next.js y React Server Components inmediatamente
  const isInternalRequest =
    request.headers.get("RSC") === "1" ||
    request.headers.get("Next-Router-Prefetch") === "1" ||
    request.headers.get("Purpose") === "prefetch" ||
    pathname.startsWith("/_next");

  if (isInternalRequest) {
    return NextResponse.next();
  }

  // 2. Verificar el token de sesión
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  // 3. Proteger rutas que requieran autenticación (ej. /dashboard)
  if (pathname.startsWith("/dashboard") && !session?.uid) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// 4. Matcher estricto para ignorar archivos estáticos, imágenes y librerías
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|api|auth|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico|woff|woff2|css|js|map)$).*)"
  ],
};
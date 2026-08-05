import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

/**
 * Lee la sesión desde una NextRequest (proxy / route handlers).
 * Devuelve { uid, email, name } o null.
 */
export async function getRequestSession(request) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const payload = token ? await verifySessionToken(token) : null;
  if (!payload?.uid) return null;
  return {
    uid: payload.uid,
    email: payload.email || null,
    name: payload.name || null,
  };
}

/**
 * Lee la sesión en Server Components / Server Actions (usa next/headers).
 */
export async function getServerSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const payload = token ? await verifySessionToken(token) : null;
  if (!payload?.uid) return null;
  return {
    uid: payload.uid,
    email: payload.email || null,
    name: payload.name || null,
  };
}
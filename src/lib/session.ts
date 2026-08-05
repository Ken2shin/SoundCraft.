import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "sc_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 días

const SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET ||
    "dev-only-insecure-secret-REPLACE-ME-in-.env-0123456789abcdef0123456789abcdef0123456789abcdef"
);

export interface SessionPayload {
  uid: string;
  email?: string | null;
  name?: string | null;
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET);
}

export async function verifySessionToken(
  token: string | null | undefined
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    if (!payload.uid) return null;
    return {
      uid: String(payload.uid),
      email: payload.email ? String(payload.email) : null,
      name: payload.name ? String(payload.name) : null,
    };
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };
}

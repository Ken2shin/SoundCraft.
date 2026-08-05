import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { verifyPassword } from "@/lib/password";
import { getUserByEmail } from "@/lib/db/repo";
import {
  createSessionToken,
  sessionCookieOptions,
  SESSION_COOKIE,
} from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "anon";
  const rl = rateLimit({ key: `login:${ip}`, limit: 10, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Demasiados intentos. Espera y vuelve a intentarlo." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter || 60) } }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json(
      { error: "Ingresa tu correo y tu contraseña." },
      { status: 400 }
    );
  }

  try {
    const user = await getUserByEmail(email);
    if (!user || !verifyPassword(password, user.password_hash)) {
      return NextResponse.json(
        { error: "Correo o contraseña incorrectos." },
        { status: 401 }
      );
    }

    const token = await createSessionToken({
      uid: user.id,
      email: user.email,
      name: user.name,
    });
    const response = NextResponse.json({ ok: true, uid: user.id });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return response;
  } catch (error) {
    console.error("[api/auth/login]", error.message);
    return NextResponse.json(
      { error: "No se pudo iniciar sesión. Inténtalo de nuevo." },
      { status: 500 }
    );
  }
}
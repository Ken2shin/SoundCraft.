import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { hashPassword } from "@/lib/password";
import { createUser, getUserByEmail } from "@/lib/db/repo";
import {
  createSessionToken,
  sessionCookieOptions,
  SESSION_COOKIE,
} from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(request) {
  const rl = rateLimit({
    key: `register:${request.headers.get("x-forwarded-for") || "anon"}:${(request.headers.get("x-real-ip")) || ""}`,
    limit: 10,
    windowMs: 60_000,
  });
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
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Ingresa un correo válido." }, { status: 400 });
  }
  if (!name || name.length > 80) {
    return NextResponse.json(
      { error: "Ingresa tu nombre (máximo 80 caracteres)." },
      { status: 400 }
    );
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "La contraseña debe tener al menos 8 caracteres." },
      { status: 400 }
    );
  }

  try {
    const existing = await getUserByEmail(email);
    if (existing) {
      return NextResponse.json(
        { error: "Ya existe una cuenta con este correo." },
        { status: 409 }
      );
    }

    const passwordHash = hashPassword(password);
    const user = await createUser({ email, name, passwordHash });

    const token = await createSessionToken({
      uid: user.id,
      email: user.email,
      name: user.name,
    });
    const response = NextResponse.json({ ok: true, uid: user.id });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return response;
  } catch (error) {
    console.error("[api/auth/register]", error.message);
    return NextResponse.json(
      { error: "No se pudo crear la cuenta. Inténtalo de nuevo." },
      { status: 500 }
    );
  }
}
import { NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/firebase-admin";
import {
  createSessionToken,
  sessionCookieOptions,
  SESSION_COOKIE,
} from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const idToken = body?.idToken;
  if (!idToken || typeof idToken !== "string" || idToken.length > 4096) {
    return NextResponse.json({ error: "Falta el idToken" }, { status: 400 });
  }

  try {
    const decoded = await verifyIdToken(idToken);
    const token = await createSessionToken({
      uid: decoded.uid,
      email: decoded.email || null,
      name: decoded.name || null,
    });
    const response = NextResponse.json({ ok: true, uid: decoded.uid });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return response;
  } catch (error) {
    console.error("[api/auth/token]", error.message);
    return NextResponse.json(
      { error: "El idToken de Firebase no es válido" },
      { status: 401 }
    );
  }
}

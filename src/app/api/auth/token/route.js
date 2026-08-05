import { NextResponse } from "next/server";
import fs from "node:fs";
import { verifyIdToken } from "@/lib/firebase-admin";
import {
  createSessionToken,
  sessionCookieOptions,
  SESSION_COOKIE,
} from "@/lib/session";

function debugLog(line) {
  try {
    fs.appendFileSync(
      "auth-debug.log",
      `${new Date().toISOString()} ${line}\n`
    );
  } catch {}
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const idToken = body?.idToken;
  debugLog(`idToken recibido: ${typeof idToken} len=${idToken?.length ?? 0}`);
  if (!idToken || typeof idToken !== "string") {
    return NextResponse.json({ error: "Falta el idToken" }, { status: 400 });
  }

  try {
    const decoded = await verifyIdToken(idToken);
    debugLog(`verifyIdToken OK uid=${decoded.uid}`);
    const token = await createSessionToken({
      uid: decoded.uid,
      email: decoded.email || null,
      name: decoded.name || null,
    });
    debugLog(`session token creado len=${token.length}`);
    const response = NextResponse.json({ ok: true, uid: decoded.uid });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return response;
  } catch (err) {
    debugLog(`FALLO: ${err.stack || err.message}`);
    console.error("[api/auth/token]", err.message);
    return NextResponse.json(
      { error: "El idToken de Firebase no es válido" },
      { status: 401 }
    );
  }
}
import { NextResponse } from "next/server";
import { getRequestSession } from "@/lib/auth";
import { ensureUser } from "@/lib/db/repo";

export async function GET(request) {
  const session = await getRequestSession(request);
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  try {
    const user = await ensureUser(session);
    return NextResponse.json({ user });
  } catch (err) {
    console.error("[api/me]", err.message);
    return NextResponse.json(
      { error: "No se pudo cargar el usuario" },
      { status: 500 }
    );
  }
}